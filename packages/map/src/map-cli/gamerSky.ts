// oxlint-disable no-console

import type { GamerSkyOptions } from './types';

import path from 'node:path';

import chalk from 'chalk';
import { merge } from 'lodash-es';

import { readJSON } from '../fs';
import { gamerSky, genImageUrls } from '../map';
import { downloadImagesCli } from './fetchImage';
import { mergeImagesCli } from './mergeImages';
import { sliceImageCli } from './sliceImage';

async function run(options: GamerSkyOptions) {
  try {
    const defaultOptions = {
      basePath: '/',
      dataFilePath: '/mapInfo.json',
      icons: {
        saveFilePath: '/icons',
      },
      maps: {
        saveFilePath: '/images',
        low: 8128,
        high: 8192,
        url: '',
        downFileExt: 'png',
      },
      mergeImages: {
        imagesPath: '/images',
        outputPath: '/merged_image.jpg',
        direction: 'horizontal',
        cols: 64,
        rows: 64,
        imageWidth: 256,
        imageHeight: 256,
        imagePattern: '{x}_{y}.png',
      },
      createTiles: {
        imagePath: '/merged_image.jpg',
        outputPath: '/maps',
        tileSize: 256,
      },
      points: {
        outputPath: '/points.json',
        outputAreaPath: '/points_area.json',
        offset: 1,
      },
    };
    // 合并配置项
    const mergeOptions = merge(defaultOptions, options);
    //
    function getPathWithBase(url: string = '') {
      return path.join(mergeOptions.basePath, url);
    }
    // 地图数据
    const mapInfo = await readJSON(getPathWithBase(mergeOptions.dataFilePath));

    if (options?.icons && options.icons?.enabled !== false) {
      console.log(chalk.bold(`\n🚀 开始获取图标图片地址...`));
      const iconUrls = await gamerSky.getIconUrls(mapInfo);
      console.log(chalk.bold(`🚀 开始下载图标图片...`));
      await downloadImagesCli(iconUrls, {
        basePath: mergeOptions.basePath,
        saveFilePath: mergeOptions.icons.saveFilePath,
        download: mergeOptions.download,
      });
    }

    let downRes: any;

    if (options?.maps && options.maps?.enabled !== false) {
      if (!mergeOptions.maps.url) {
        throw new Error('地图图片地址不存在');
      }
      console.log(chalk.bold(`\n🚀 开始获取地图图片地址...`));
      const imageUrls = await genImageUrls(
        mergeOptions.maps.low,
        mergeOptions.maps.high,
        mergeOptions.maps.url,
        mergeOptions.maps.downFileExt,
      );
      console.log(chalk.bold(`🚀 开始下载地图图片...`));
      downRes = await downloadImagesCli(imageUrls, {
        basePath: mergeOptions.basePath,
        saveFilePath: mergeOptions.maps.saveFilePath,
        download: mergeOptions.download,
      });
    }

    if (downRes?.failCount > 0) {
      console.log(
        chalk.yellow(`⚠ 注意: 地图图片有错误下载，请手动完善后再合并`),
      );
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
      console.log(chalk.bold(`\n🚀 开始生成地标数据文件...`));
      const res = await gamerSky.genPoints({
        ...mergeOptions.points,
        mapInfo,
        outputPath: getPathWithBase(mergeOptions.points.outputPath),
        outputAreaPath: getPathWithBase(mergeOptions.points.outputAreaPath),
      });
      console.log(chalk(`📂 文件保存位置: ${path.resolve(res.outputPath)}`));
    }
  } catch (error) {
    console.log(error);
  }
}

export default run;
