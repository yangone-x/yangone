import { Buffer } from 'node:buffer';
import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

// oxlint-disable no-console
import { merge } from 'lodash-es';
import pLimit from 'p-limit';
import sharp from 'sharp';
export interface SliceImageOptions {
  /**
   * 最大并发
   * @default 10
   */
  concurrency?: number;
  /**
   * 原图路径
   * @default './merged_image.png'
   */
  imagePath?: string;
  /**
   * 最大缩放级别
   * @default 6
   */
  maxZoom?: number;
  /**
   * 进度回调
   */
  onTick?: ({ z, x, y }: { x: number; y: number; z: number }) => void;
  /**
   * 瓦片保存路径
   * @default './maps'
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
    outputPath: './maps',
    tileSize: 256,
    maxZoom: 6,
    concurrency: 10,
    tileExt: 'png',
    sharpPixelLimit: 1_000_000_000,
    quality: 80,
    imagePath: './merged_image.png',
  };

  const mergeOptions = merge(defaultOptions, options);

  // 设置 sharp 全局并发，避免内部线程池过大
  sharp.concurrency(1);

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
  const limit = pLimit(mergeOptions.concurrency);
  const absoluteOutRoot = path.resolve(mergeOptions.outputPath);
  // 预创建根目录
  await fs.mkdir(absoluteOutRoot, { recursive: true });

  // 预定义编码器函数
  const encodeTile = async (
    buffer: Buffer,
    width: number,
    height: number,
    tilePath: string,
  ) => {
    const ext = mergeOptions.tileExt.toLowerCase();
    const quality = mergeOptions.quality;

    let pipeline = sharp(buffer, {
      raw: {
        width,
        height,
        channels: meta.channels || 3,
      },
    });

    if (ext === 'jpeg' || ext === 'jpg') {
      pipeline = pipeline.jpeg({ quality, progressive: true });
    } else if (ext === 'webp') {
      pipeline = pipeline.webp({ quality, effort: 1 }); // effort 1 更快
    } else {
      // PNG: 降低压缩等级以换取速度
      pipeline = pipeline.png({
        compressionLevel: 1,
        adaptiveFiltering: false,
      });
    }

    return pipeline.toFile(tilePath);
  };

  for (let z = 0; z <= mergeOptions.maxZoom; z++) {
    const scaleFactor = 1 / 2 ** (mergeOptions.maxZoom - z);
    const currW = Math.floor(originW * scaleFactor);
    const currH = Math.floor(originH * scaleFactor);

    if (currW < 1 || currH < 1) continue;

    // 一次性将整个层级缩放并转为 raw buffer
    // 避免后续每个瓦片都去操作 sharp 实例
    const scaledBuffer = await sharp(mergeOptions.imagePath, {
      limitInputPixels: mergeOptions.sharpPixelLimit,
    })
      .resize(currW, currH, {
        fit: 'fill',
        kernel: sharp.kernel.lanczos3,
      })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const cols = Math.ceil(currW / mergeOptions.tileSize);
    const rows = Math.ceil(currH / mergeOptions.tileSize);
    const channels = meta.channels || 3;
    const tileSize = mergeOptions.tileSize;

    const tasks = [];

    // 预先为该 Z 层级创建所有 X 目录
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
              // 从 raw buffer 中提取像素数据
              // raw buffer 是一维数组: [R,G,B, R,G,B, ...]
              // 需要计算偏移量
              const tileBuffer = Buffer.alloc(w * h * channels);

              for (let row = 0; row < h; row++) {
                const srcY = top + row;
                const srcOffset = (srcY * currW + left) * channels;
                const destOffset = row * w * channels;
                const length = w * channels;

                // 内存拷贝
                scaledBuffer.data.copy(
                  tileBuffer,
                  destOffset,
                  srcOffset,
                  srcOffset + length,
                );
              }

              // 需要填充边缘（当 w 或 h 小于 tileSize 时）
              let finalBuffer = tileBuffer;
              let finalW = w;
              let finalH = h;

              if (w < tileSize || h < tileSize) {
                finalW = tileSize;
                finalH = tileSize;
                finalBuffer = Buffer.alloc(tileSize * tileSize * channels);
                // 填充白色背景 (假设 RGB)
                if (channels === 3) {
                  finalBuffer.fill(255);
                } else if (channels === 4) {
                  // RGBA 填充白色不透明
                  for (let i = 0; i < finalBuffer.length; i += 4) {
                    finalBuffer[i] = 255;
                    finalBuffer[i + 1] = 255;
                    finalBuffer[i + 2] = 255;
                    finalBuffer[i + 3] = 255;
                  }
                }

                // 将实际图像数据拷贝到左上角
                for (let row = 0; row < h; row++) {
                  const srcOffset = row * w * channels;
                  const destOffset = row * tileSize * channels;
                  tileBuffer.copy(
                    finalBuffer,
                    destOffset,
                    srcOffset,
                    srcOffset + w * channels,
                  );
                }
              }

              const tilePath = path.join(
                absoluteOutRoot,
                String(z),
                String(x),
                `${y}.${mergeOptions.tileExt}`,
              );

              await encodeTile(finalBuffer, finalW, finalH, tilePath);
              generatedTiles++;

              if (mergeOptions?.onTick) {
                mergeOptions.onTick({ z, x, y });
              }
            } catch {}
          }),
        );
      }
    }

    await Promise.all(tasks);
  }

  return {
    outputPath: absoluteOutRoot,
    tilesGenerated: generatedTiles,
    originalSize: `${originW}x${originH}`,
    maxZoom: mergeOptions.maxZoom,
  };
}
