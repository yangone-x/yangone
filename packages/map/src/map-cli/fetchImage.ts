import type {
  FetchImagesOptions,
  FetchImagesResult,
  ImageData,
} from '../image';

import fsSync from 'node:fs';
import fs from 'node:fs/promises';

import { confirm, log, outro, progress } from '@clack/prompts';
import chalk from 'chalk';
import { merge } from 'lodash-es';

import { fetchImages } from '../image';
import logger from '../logger';

export async function fetchImagesCli(
  options: FetchImagesOptions,
): Promise<FetchImagesResult> {
  // 默认配置项
  const defaultOptions = {
    outputPath: '/images',
  };
  const mergeOptions = merge(defaultOptions, options);

  // 判断outputPath是否存在
  if (fsSync.existsSync(mergeOptions.outputPath)) {
    const shouldProceed = await confirm({
      message: '目标路径文件已存在，是否继续下载？',
      initialValue: false,
      vertical: true,
      active: 'Yes（将删除原有文件）',
      inactive: 'No',
    });
    if (!shouldProceed) {
      outro('已取消');
      return { failCount: 0, successCount: 0, failFiles: [] };
    }
    await fs.rm(mergeOptions.outputPath, { recursive: true, force: true });
  }

  async function down(imageData: ImageData) {
    log.info(chalk.bold(`🚀 开始下载 ${imageData.length} 个文件...`));
    // 初始化进度条
    const prog = progress({
      max: imageData.length,
      indicator: 'timer',
      style: 'block',
      size: 40,
    });

    prog.start('正在下载图片...');

    const downRes = await fetchImages({
      ...mergeOptions,
      onTick({ filename }) {
        prog.advance(undefined, filename);
      },
      onTickError({ url, filename, error }) {
        logger.error(
          `[${mergeOptions.outputPath}]失败: ${url} => ${filename} (${error})`,
        );
      },
    });

    prog.stop(
      chalk.green(`🎉 下载完成: 成功 ${downRes.successCount} 张, `) +
        chalk.red(`失败 ${downRes.failCount} 张`),
    );

    return downRes;
  }

  let downRes = await down(mergeOptions.images);
  if (downRes.failCount > 0) {
    log.warn(
      chalk.bold(`⚠ 检测到有 ${downRes.failCount} 个文件下载失败，正在重试...`),
    );
    downRes = await down(downRes.failFiles);
  }

  return downRes;
}
