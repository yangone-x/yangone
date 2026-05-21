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
   * @default os.availableParallelism()
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
   * 输出质量 (0-100)
   * PNG: 忽略此值，使用 compressionLevel
   * JPEG/WEBP: 控制质量
   * @default 80
   */
  quality?: number;
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
    concurrency: os.availableParallelism(),
    tileExt: 'png',
    sharpPixelLimit: 1_000_000_000,
    quality: 80,
  };

  const mergeOptions = merge(defaultOptions, options);

  const DEFAULT_CONCURRENCY = Math.max(
    mergeOptions.concurrency,
    os.availableParallelism(),
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

  // 根据格式确定编码器配置
  const getEncoder = (pipeline: sharp.Sharp) => {
    const ext = mergeOptions.tileExt.toLowerCase();
    const quality = mergeOptions.quality;

    switch (ext) {
      case 'jpeg':
      case 'jpg': {
        return pipeline.jpeg({ quality, progressive: true });
      }
      case 'webp': {
        return pipeline.webp({ quality, effort: 2 });
      } // effort 2 是速度与压缩率的平衡
      default: {
        // PNG 压缩等级 9 非常慢，建议降至 6 或 4
        return pipeline.png({
          quality: 100, // PNG 是无损的，quality 参数在某些版本无效，主要靠 compressionLevel
          compressionLevel: 6,
          progressive: false,
        });
      }
    }
  };

  for (let z = 0; z <= mergeOptions.maxZoom; z++) {
    const scaleFactor = 1 / 2 ** (mergeOptions.maxZoom - z);
    const currW = Math.floor(originW * scaleFactor);
    const currH = Math.floor(originH * scaleFactor);

    if (currW < 1 || currH < 1) continue;

    // 为当前层级创建一个基础的 resized 实例
    const scaledImage = sharp(mergeOptions.imagePath, {
      limitInputPixels: mergeOptions.sharpPixelLimit,
    }).resize(currW, currH, {
      fit: 'fill',
      kernel: sharp.kernel.lanczos3, // Lanczos 质量好但稍慢，如需极速可改为 'nearest' 或 'biliner'
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

              // 应用编码器
              const encoder = getEncoder(pipeline);

              // 编码并写入
              const tilePath = path.join(
                absoluteOutRoot,
                String(z),
                String(x),
                `${y}.${mergeOptions.tileExt}`,
              );

              // 写入文件
              await encoder.toFile(tilePath);

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
