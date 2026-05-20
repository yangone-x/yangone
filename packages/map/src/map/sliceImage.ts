import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// oxlint-disable no-console
import { merge } from 'lodash-es';
import pLimit from 'p-limit';
import sharp from 'sharp';

export interface SliceImageOptions {
  /**
   * 最大并发下载数
   * @default 5
   */
  concurrency?: number;
  /**
   * 原图路径
   */
  imagePath: string;
  /**
   * 最大缩放级别
   * @default 6
   */
  maxZoom?: number;
  /**
   * 进度回调
   */
  onTick?: ({ zoom }: { zoom: number }) => void;
  /**
   * 瓦片保存路径
   * @default '/maps'
   */
  outputPath?: string;
  /**
   * Sharp 的像素限制
   * @default 1_000_000_000
   */
  sharpPixelLimit?: number;
  /**
   * 瓦片后缀
   * @default "png"
   */
  tileExt?: string;
  /**
   * 瓦片大小
   * @default 256
   */
  tileSize?: number;
}

/**
 * 切图，生成 XYZ 瓦片
 */
export async function sliceImage(options: SliceImageOptions) {
  const defaultOptions = {
    outputPath: '/maps',
    tileSize: 256,
    maxZoom: 6,
    concurrency: 5,
    tileExt: 'png',
    sharpPixelLimit: 1_000_000_000,
  };

  const mergeOptions = merge(defaultOptions, options);

  const DEFAULT_CONCURRENCY = Math.min(
    mergeOptions.concurrency,
    os.cpus().length,
  );

  if (!fsSync.existsSync(mergeOptions.imagePath)) {
    throw new Error(`原图不存在：${mergeOptions.imagePath}`);
  }

  const meta = await sharp(mergeOptions.imagePath, {
    limitInputPixels: mergeOptions.sharpPixelLimit,
  }).metadata();
  if (!meta.width || !meta.height) {
    throw new Error('无法获取图片尺寸');
  }

  const originW = meta.width; // 原图宽度
  const originH = meta.height; // 原图高度

  let generatedTiles = 0;
  // 提高并发数以充分利用 CPU，因为 Sharp 内部有线程池
  const limit = pLimit(DEFAULT_CONCURRENCY);
  const absoluteOutRoot = path.resolve(mergeOptions.outputPath);

  // 预创建根目录
  await fs.mkdir(absoluteOutRoot, { recursive: true });

  for (let z = 0; z <= mergeOptions.maxZoom; z++) {
    const scaleFactor = 1 / 2 ** (mergeOptions.maxZoom - z);
    const currW = Math.floor(originW * scaleFactor);
    const currH = Math.floor(originH * scaleFactor);

    if (currW < 1 || currH < 1) continue;

    const scaledImage = sharp(mergeOptions.imagePath, {
      limitInputPixels: mergeOptions.sharpPixelLimit,
    }).resize(currW, currH, {
      fit: 'fill',
      kernel: sharp.kernel.lanczos3,
    });

    const cols = Math.ceil(currW / mergeOptions.tileSize);
    const rows = Math.ceil(currH / mergeOptions.tileSize);

    const tasks = [];

    // 预先为该 Z 层级创建所有 X 目录
    // 这样可以避免在每个瓦片任务中竞争性地创建目录
    const zDirRoot = path.join(absoluteOutRoot, String(z));
    await fs.mkdir(zDirRoot, { recursive: true });

    // 创建所有 x 目录
    const mkdirTasks = [];
    for (let x = 0; x < cols; x++) {
      mkdirTasks.push(
        fs.mkdir(path.join(zDirRoot, String(x)), { recursive: true }),
      );
    }
    await Promise.all(mkdirTasks);

    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        const left = x * mergeOptions.tileSize;
        const top = y * mergeOptions.tileSize;
        const w = Math.min(mergeOptions.tileSize, currW - left);
        const h = Math.min(mergeOptions.tileSize, currH - top);

        tasks.push(
          limit(async () => {
            try {
              // 构建管道
              // 使用 clone() 确保每个任务独立
              let pipeline = scaledImage.clone().extract({
                left,
                top,
                width: w,
                height: h,
              });

              // 处理边缘填充
              if (w < mergeOptions.tileSize || h < mergeOptions.tileSize) {
                pipeline = pipeline.extend({
                  top: 0,
                  bottom: mergeOptions.tileSize - h,
                  left: 0,
                  right: mergeOptions.tileSize - w,
                  background: { r: 255, g: 255, b: 255, alpha: 1 },
                });
              }

              // 编码并写入
              const tilePath = path.join(
                absoluteOutRoot,
                String(z),
                String(x),
                `${y}.${mergeOptions.tileExt}`,
              );

              await pipeline
                .png({
                  quality: 85,
                  compressionLevel: 9,
                })
                .toFile(tilePath);

              generatedTiles++;
            } catch {}
          }),
        );
      }
    }

    await Promise.all(tasks);

    if (mergeOptions?.onTick) {
      mergeOptions.onTick({ zoom: z });
    }
  }

  return {
    outputPath: absoluteOutRoot,
    tilesGenerated: generatedTiles,
    originalSize: `${originW}x${originH}`,
    maxZoom: mergeOptions.maxZoom,
  };
}
