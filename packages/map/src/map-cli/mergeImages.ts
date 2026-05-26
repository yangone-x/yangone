import type { MergeImagesOptions } from '../image';

import fsSync from 'node:fs';
import fs from 'node:fs/promises';

import { confirm, intro, log, outro, progress } from '@clack/prompts';
import chalk from 'chalk';
import { merge } from 'lodash-es';

import { mergeImages } from '../image';

export async function mergeImagesCli(options: MergeImagesOptions) {
  intro(chalk.bold(`🚀 启动图片合并...`));

  const defaultOptions = {
    imagesPath: './images',
    outputPath: './merged_image.webp',
    rows: 64,
  };

  const mergeOptions = merge(defaultOptions, options);

  // 判断imagesPath是否存在
  if (!fsSync.existsSync(mergeOptions.imagesPath)) {
    log.warn(
      chalk.red(`❌ ${mergeOptions.imagesPath} 路径不存在，请检查路径是否正确`),
    );
    return;
  }

  // 判断outputPath是否存在
  if (fsSync.existsSync(mergeOptions.outputPath)) {
    const shouldProceed = await confirm({
      message: '目标路径文件已存在，是否继续合并？',
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

  // 进度条
  const prog = progress({
    max: mergeOptions.rows,
    indicator: 'timer',
    style: 'block',
  });

  prog.start('合并图片中...');

  const mergeRes = await mergeImages({
    ...mergeOptions,
    onTick: () => {
      prog.advance();
    },
  });

  prog.stop(
    chalk.green(
      `✅ 合并图片成功，尺寸：${mergeRes.totalWidth}x${mergeRes.totalHeight}`,
    ),
  );

  outro(chalk(`📂 文件保存位置: ${mergeRes.outputPath}`));
}
