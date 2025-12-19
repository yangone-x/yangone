/* eslint-disable no-console */
import type { MapgenieOptions } from './types';

import path from 'node:path';

import chalk from 'chalk';
import merge from 'lodash.merge';

import { readJSON } from '../fs';
import { createTiles, genImageUrls, mapgenie, mergeImages } from '../map';
import { downloadImagesCli } from './fetchImage';

async function run(options: MapgenieOptions) {
  try {
    const defaultOptions = {
      basePath: '/',
      dataFilePath: '/mapInfo.json',
      maps: {
        saveFilePath: '/images',
        low: 8128,
        high: 8192,
        url: '',
      },
      mergeImages: {
        imagesPath: '/images',
        outputPath: '/merged_image.jpg',
        direction: 'horizontal',
        imagesPerRow: 64,
        imageWidth: 256,
        imageHeight: 256,
      },
      createTiles: {
        imagesPath: '/merged_image.jpg',
        outputPath: '/maps',
        tileSize: 256,
      },
      points: {
        outputPath: '/points.json',
        offset: 1,
      },
      pointsToExcel: {
        inputPath: '/points.json',
        outputPath: '/points.xlsx',
        worksheetName: 'Sheet1',
      },
      excelToPoints: {
        inputPath: '/points.json',
        inputExcelPath: '/newPoints.xlsx',
        outputPath: '/newPoints.json',
        worksheetName: 'Sheet1',
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
        console.log(chalk.bold(`\n🚀 开始合并图片...`));
        const mergeRes = await mergeImages({
          ...mergeOptions.mergeImages,
          imagesPath: getPathWithBase(mergeOptions.mergeImages.imagesPath),
          outputPath: getPathWithBase(mergeOptions.mergeImages.outputPath),
        });
        console.log(
          chalk.green(`✅ 合并图片成功，尺寸：${mergeRes.mergedSize}`),
        );
        console.log(chalk(`📂 文件保存位置: ${mergeRes.outputPath}`));
      }

      if (options?.createTiles && options.createTiles?.enabled !== false) {
        console.log(chalk.bold(`\n🚀 开始生成瓦片地图...`));
        const createRes = await createTiles({
          ...mergeOptions.createTiles,
          imagesPath: getPathWithBase(mergeOptions.createTiles.imagesPath),
          outputPath: getPathWithBase(mergeOptions.createTiles.outputPath),
        });
        console.log(
          chalk.green(
            `✅ 生成瓦片地图成功，文件数：${createRes.tilesGenerated}`,
          ),
        );
        console.log(chalk(`📂 文件保存位置: ${createRes.outputPath}`));
      }
    }

    if (options?.points && options.points?.enabled !== false) {
      console.log(chalk.bold(`\n🚀 开始生成地标数据文件...`));
      const res = await mapgenie.genPoints({
        ...mergeOptions.points,
        gameUrl: path.basename(mergeOptions.basePath),
        mapInfo,
        outputPath: getPathWithBase(mergeOptions.points.outputPath),
      });
      console.log(chalk(`📂 文件保存位置: ${path.resolve(res.outputPath)}`));
    }

    if (options.pointsToExcel && options.pointsToExcel?.enabled !== false) {
      console.log(chalk.bold(`\n🚀 开始根据地标生成地标数据表格文件...`));
      const exRes = await mapgenie.writePointExcel({
        ...mergeOptions.pointsToExcel,
        inputPath: getPathWithBase(mergeOptions.pointsToExcel.inputPath),
        outputPath: getPathWithBase(mergeOptions.pointsToExcel.outputPath),
      });
      console.log(chalk(`📂 文件保存位置: ${path.resolve(exRes.outputPath)}`));
    }

    if (options?.excelToPoints && options.excelToPoints?.enabled !== false) {
      console.log(chalk.bold(`\n🚀 开始根据数据表格文件生成地标数据...`));
      const exRes = await mapgenie.readPointExcel({
        ...mergeOptions.excelToPoints,
        inputPath: getPathWithBase(mergeOptions.excelToPoints.inputPath),
        inputExcelPath: getPathWithBase(
          mergeOptions.excelToPoints.inputExcelPath,
        ),
        outputPath: getPathWithBase(mergeOptions.excelToPoints.outputPath),
      });
      console.log(chalk(`📂 文件保存位置: ${path.resolve(exRes.outputPath)}`));
    }
  } catch (error) {
    console.log(error);
  }
}

export default run;
