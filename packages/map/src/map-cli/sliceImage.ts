import type { SliceImageOptions } from '../image';

import fsSync from 'node:fs';
import fs from 'node:fs/promises';

import { confirm, intro, log, outro, progress } from '@clack/prompts';
import chalk from 'chalk';
import { merge } from 'lodash-es';
import sharp from 'sharp';

import { sliceImage } from '../image';

export async function sliceImageCli(options: SliceImageOptions) {
  intro(chalk.bold(`🚀 启动图片切片...`));

  const defaultOptions = {
    outputPath: './maps',
    minZoom: 8,
    imagePath: './merged_image.png',
    sharpPixelLimit: 1_000_000_000,
    tileSize: 256,
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

  const imageMeta = await sharp(mergeOptions.imagePath, {
    limitInputPixels: mergeOptions.sharpPixelLimit,
  }).metadata();
  if (!imageMeta.width || !imageMeta.height) {
    throw new Error('无法获取图片尺寸');
  }

  const longestSide = Math.max(imageMeta.width, imageMeta.height);
  const tileSize = mergeOptions.tileSize;
  const minZoom = mergeOptions.minZoom;
  const maxZoom = Math.max(
    minZoom,
    minZoom + Math.ceil(Math.log2(longestSide / tileSize)),
  );

  // 计算总进度
  let total = 0;
  for (let z = minZoom; z <= maxZoom; z++) {
    const scaleFactor = 1 / 2 ** (maxZoom - z);
    const currW = Math.floor(imageMeta.width * scaleFactor);
    const currH = Math.floor(imageMeta.height * scaleFactor);
    total += Math.ceil(currW / tileSize) * Math.ceil(currH / tileSize);
  }

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
  }).start();

  prog.stop(chalk.green(`✅ 切片成功，文件数：${createRes.tilesGenerated}`));

  outro(chalk(`📂 文件保存位置: ${createRes.outputPath}`));
}
