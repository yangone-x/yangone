// oxlint-disable no-console
import type { MergeImagesOptions } from '../map';

import chalk from 'chalk';
import { merge } from 'lodash-es';
import ProgressBar from 'progress';

import { mergeImages } from '../map';

export async function mergeImagesCli(options: MergeImagesOptions) {
  console.log(chalk.bold(`\n🚀 开始合并图片...`));

  const defaultOptions = {
    imagesPath: '/images',
    outputPath: '/merged_image.webp',
    direction: 'horizontal',
    cols: 64,
    rows: 64,
    imageWidth: 256,
    imageHeight: 256,
    imagePattern: '{x}_{y}.png',
  };

  const mergeOptions = merge(defaultOptions, options);

  // 进度条
  let progressBar: null | ProgressBar = null;

  // 初始化进度条
  progressBar = new ProgressBar(
    chalk.cyan('[:bar] :percent :etas :current/:total'),
    {
      complete: '█',
      incomplete: '░',
      width: 40,
      total: mergeOptions.rows,
      renderThrottle: 500,
    },
  );

  const mergeRes = await mergeImages({
    ...mergeOptions,
    onTick: () => {
      progressBar?.tick();
    },
  });

  console.log(
    chalk.green(
      `✅ 合并图片成功，尺寸：${mergeRes.totalWidth}x${mergeRes.totalHeight}`,
    ),
  );
  console.log(chalk(`📂 文件保存位置: ${mergeRes.outputPath}`));
}
