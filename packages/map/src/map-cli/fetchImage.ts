/* eslint-disable no-console */
import type { DownloadResult } from '../map';
import type { ImageData } from '../map/types';
import type { DownloadOptions } from './types';

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import merge from 'lodash.merge';
import ProgressBar from 'progress';

import logger from '../logger';
import { downloadImages } from '../map';

interface Options {
  allowCancel?: boolean;
  basePath?: string;
  download?: DownloadOptions;
  saveFilePath?: string;
}

export async function downloadImagesCli(
  imageData: ImageData,
  options: Options = {},
): Promise<DownloadResult> {
  // 默认配置项
  const defaultOptions = {
    allowCancel: true,
    basePath: '/',
    saveFilePath: '/images',
  };
  const mergeOptions = merge(defaultOptions, options);

  // 设置日志生成路径
  logger.setLogDir(mergeOptions.basePath);
  // 进度条
  let progressBar: null | ProgressBar = null;
  // 保存文件路径
  let finalSaveFolder = path.join(
    mergeOptions.basePath,
    mergeOptions.saveFilePath,
  );

  // 处理已存在的文件夹
  if (
    fs.existsSync(finalSaveFolder) &&
    fs.readdirSync(finalSaveFolder).length > 0
  ) {
    const choices = [
      { name: `自动创建新文件夹（如 ${finalSaveFolder}_1）`, value: 'auto' },
      { name: '手动输入新文件夹名称', value: 'custom' },
      {
        name: chalk.red('继续使用现有文件夹（可能覆盖文件）'),
        value: 'overwrite',
      },
    ];

    if (mergeOptions.allowCancel) {
      choices.push({ name: chalk.yellow('❌ 取消下载'), value: 'cancel' });
    }

    const answer = await select({
      message: chalk.yellow(`⚠ 文件夹 "${finalSaveFolder}" 已存在且不为空`),
      choices,
      default: 'auto',
    });

    if (answer === 'cancel') {
      console.log(chalk.yellow('🛑 下载任务已取消'));
      return {
        failCount: 0,
        failFiles: [],
        successCount: 0,
      };
    }

    if (answer === 'custom') {
      const answer = await input({
        message: '请输入新文件夹名称:',
        validate: (input) => {
          if (!input.trim()) return '文件夹名不能为空';
          if (/[<>:"/\\|?*]/.test(input)) return '不能包含特殊字符';
          return true;
        },
      });
      finalSaveFolder = path.join(mergeOptions.basePath, answer);
    } else if (answer === 'auto') {
      finalSaveFolder = getAutoIncrementedFolder(finalSaveFolder);
    }
  }

  // 创建目标文件夹
  if (!fs.existsSync(finalSaveFolder)) {
    fs.mkdirSync(finalSaveFolder, { recursive: true });
    console.log(chalk.green(`📂 已创建文件夹: ${finalSaveFolder}`));
  }

  async function down(imageData: ImageData) {
    console.log(chalk.bold(`🚀 开始下载 ${imageData.length} 个文件...`));

    // 初始化进度条
    progressBar = new ProgressBar(
      chalk.cyan('[:bar] :percent :etas :current/:total :file'),
      {
        complete: '█',
        incomplete: '░',
        width: 40,
        total: imageData.length,
        renderThrottle: imageData.length > 100 ? 500 : 100,
      },
    );

    // 添加进度跟踪
    let tickCount = 0;
    const expectedTicks = imageData.length;

    const downRes = await downloadImages(imageData, finalSaveFolder, {
      ...mergeOptions.download,
      onTick({ filename }) {
        tickCount++;
        progressBar?.tick({
          file: filename,
        });
      },
      onTickError({ url, filename, error }) {
        tickCount++;
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(
          chalk.red(`❌ 失败: ${url} => ${filename} (${error})`),
        );
        logger.error(
          `[${finalSaveFolder}]失败: ${url} => ${filename} (${error})`,
        );
        if (progressBar) process.stdout.write('\n');
      },
    });

    if (progressBar) {
      if (tickCount >= expectedTicks && !progressBar.complete) {
        progressBar.update(1); // 确保进度条到达100%
      }
      progressBar.terminate();
    }

    console.log(
      chalk.green(`🎉 下载完成: 成功 ${downRes.successCount} 张, `) +
        chalk.red(`失败 ${downRes.failCount} 张`),
    );

    return downRes;
  }

  let downRes = await down(imageData);
  if (downRes.failCount > 0) {
    console.log(
      chalk.bold(`⚠ 检测到有 ${downRes.failCount} 个文件下载失败，正在重试...`),
    );
    progressBar = null;
    downRes = await down(downRes.failFiles);
  }
  return downRes;
}

/**
 * 生成自动递增的文件夹名
 * @param baseFolder 基础文件夹名
 * @returns 递增后的文件夹名
 */
function getAutoIncrementedFolder(baseFolder: string): string {
  let counter = 1;
  while (fs.existsSync(`${baseFolder}_${counter}`)) {
    counter++;
  }
  const newFolder = `${baseFolder}_${counter}`;
  console.log(chalk.blue(`📂 自动创建新文件夹: ${newFolder}`));
  return newFolder;
}
