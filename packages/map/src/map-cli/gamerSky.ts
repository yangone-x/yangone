import type { GamerSkyOptions } from './types';

import path from 'node:path';

import { intro, log, outro } from '@clack/prompts';
import chalk from 'chalk';
import { merge } from 'lodash-es';

import { readJSON } from '../fs';
import logger from '../logger';
import { gamerSky, genImageUrls } from '../map';
import { fetchImagesCli } from './fetchImage';
import { mergeImagesCli } from './mergeImages';
import { sliceImageCli } from './sliceImage';

async function run(options: GamerSkyOptions) {
  try {
    const defaultOptions = {
      basePath: '/',
      dataFilePath: './mapInfo.json',
      icons: {
        outputPath: './icons',
      },
      maps: {
        outputPath: './images',
        low: 8128,
        high: 8192,
        url: '',
        downFileExt: 'png',
      },
      mergeImages: {
        imagesPath: './images',
        outputPath: './merged_image.png',
        direction: 'horizontal',
        cols: 64,
        rows: 64,
        imageWidth: 256,
        imageHeight: 256,
        imagePattern: '{x}_{y}.png',
      },
      createTiles: {
        imagePath: './merged_image.png',
        outputPath: './maps',
        tileSize: 256,
      },
      points: {
        outputPath: './points.json',
        outputAreaPath: './points_area.json',
        offset: 1,
      },
    };
    // 合并配置项
    const mergeOptions = merge(defaultOptions, options);
    // 设置日志生成路径
    logger.setLogDir(mergeOptions.basePath);

    function getPathWithBase(url: string = '') {
      return path.join(mergeOptions.basePath, url);
    }
    // 地图数据
    const mapInfo = await readJSON(getPathWithBase(mergeOptions.dataFilePath));

    if (options?.icons && options.icons?.enabled !== false) {
      intro(chalk.bold(`🚀 开始获取图标图片地址...`));
      const iconUrls = await gamerSky.getIconUrls(mapInfo);
      await fetchImagesCli({
        images: iconUrls,
        outputPath: getPathWithBase(mergeOptions.icons.outputPath),
      });
      outro(chalk(`📂 文件保存位置: ${getPathWithBase(mergeOptions.icons.outputPath)}`));
    }

    let downRes: any;

    if (options?.maps && options.maps?.enabled !== false) {
      if (!mergeOptions.maps.url) {
        throw new Error('地图图片地址不存在');
      }

      intro(chalk.bold(`🚀 开始获取地图图片地址...`));
      const imageUrls = await genImageUrls(
        mergeOptions.maps.low,
        mergeOptions.maps.high,
        mergeOptions.maps.url,
        mergeOptions.maps.downFileExt,
      );
      downRes = await fetchImagesCli({
        ...mergeOptions.maps.download,
        images: imageUrls,
        outputPath: getPathWithBase(mergeOptions.maps.outputPath),
      });
      outro(chalk(`📂 文件保存位置: ${getPathWithBase(mergeOptions.maps.outputPath)}`));
    }

    if (downRes?.failCount > 0) {
      log.warn(chalk.yellow(`⚠ 注意: 地图图片有错误下载，请手动完善后再合并`));
    } else {
      if (options?.mergeImages && options.mergeImages?.enabled !== false) {
        await mergeImagesCli({
          ...mergeOptions.mergeImages,
          imagesPath: getPathWithBase(mergeOptions.mergeImages.imagesPath),
          outputPath: getPathWithBase(mergeOptions.mergeImages.outputPath),
        });
      }

      if (options?.createTiles && options.createTiles?.enabled !== false) {
        await sliceImageCli({
          ...mergeOptions.createTiles,
          imagePath: getPathWithBase(mergeOptions.createTiles.imagePath),
          outputPath: getPathWithBase(mergeOptions.createTiles.outputPath),
        });
      }
    }

    if (options?.points && options.points?.enabled !== false) {
      intro(chalk.bold(`🚀 开始生成地标数据文件...`));
      const res = await gamerSky.genPoints({
        ...mergeOptions.points,
        mapInfo,
        outputPath: getPathWithBase(mergeOptions.points.outputPath),
        outputAreaPath: getPathWithBase(mergeOptions.points.outputAreaPath),
      });
      outro(chalk(`📂 文件保存位置: ${path.resolve(res.outputPath)}`));
    }
  } catch (error: any) {
    log.error(error.message);
  }
}

export default run;
