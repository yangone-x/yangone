// oxlint-disable no-console
import type { SliceImageOptions } from '../map';

import chalk from 'chalk';
import { merge } from 'lodash-es';
import ProgressBar from 'progress';

import { sliceImage } from '../map';

export async function sliceImageCli(options: SliceImageOptions) {
  console.log(chalk.bold(`\n🚀 开始生成瓦片地图...`));

  const defaultOptions = {
    outputPath: '/maps',
    tileSize: 256,
    maxZoom: 6,
    concurrency: 5,
    tileExt: 'png',
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
      total: mergeOptions.maxZoom,
      renderThrottle: 500,
    },
  );

  const createRes = await sliceImage({
    ...mergeOptions,
    onTick: () => {
      progressBar?.tick();
    },
  });

  console.log(
    chalk.green(`✅ 生成瓦片地图成功，文件数：${createRes.tilesGenerated}`),
  );
  console.log(chalk(`📂 文件保存位置: ${createRes.outputPath}`));
}
