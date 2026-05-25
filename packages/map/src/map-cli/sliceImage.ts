import type { SliceImageOptions } from '../image';

import fsSync from 'node:fs';
import fs from 'node:fs/promises';

import { confirm, intro, log, outro, progress } from '@clack/prompts';
import chalk from 'chalk';
import { merge } from 'lodash-es';

import { sliceImage } from '../image';

export async function sliceImageCli(options: SliceImageOptions) {
  intro(chalk.bold(`🚀 启动图片切片...`));

  const defaultOptions = {
    outputPath: '/maps',
    tileSize: 256,
    maxZoom: 6,
    concurrency: 5,
    tileExt: 'png',
  };

  const mergeOptions = merge(defaultOptions, options);

  // 判断imagesPath是否存在
  if (!fsSync.existsSync(mergeOptions.imagePath)) {
    log.warn(
      chalk.red(`❌ ${mergeOptions.imagePath} 路径不存在，请检查路径是否正确`),
    );
    return;
  }

  // 判断outputPath是否存在
  if (fsSync.existsSync(mergeOptions.outputPath)) {
    const shouldProceed = await confirm({
      message: '目标路径文件已存在，是否继续切片？',
      initialValue: false,
      vertical: true,
      active: 'Yes（将删除原有文件）',
      inactive: 'No',
    });
    if (!shouldProceed) {
      outro('已取消');
      return;
    }
    await fs.rm(mergeOptions.outputPath, { recursive: true, force: true });
  }

  // 计算总进度
  // 累加 从  2的0次方到 2的maxZoom次方
  const total = Array.from({ length: mergeOptions.maxZoom + 1 })
    .map((_, i) => 2 ** i)
    .reduce((acc, cur) => acc + cur * cur, 0);

  // 进度条
  const prog = progress({
    max: total,
    indicator: 'timer',
    style: 'block',
  });

  prog.start('正在切片中...');

  const createRes = await sliceImage({
    ...mergeOptions,
    onTick: ({ x, y, z }) => {
      prog.advance(undefined, `${z}:${x}_${y}`);
    },
  });

  prog.stop(chalk.green(`✅ 切片成功，文件数：${createRes.tilesGenerated}`));

  outro(chalk(`📂 文件保存位置: ${createRes.outputPath}`));
}
