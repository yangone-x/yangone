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
   * 压缩等级 (0-9)
   * 适用：PNG
   * @default 6
   */
  compressionLevel?: number;
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
   * 最小缩放级别
   * 目录结构从该层开始，例如 /8/127/127.jpg
   * @default 8
   */
  minZoom?: number;
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

export interface SliceImageResult {
  /**
   * 最大缩放级别
   */
  maxZoom: number;
  /**
   * 最小缩放级别
   */
  minZoom: number;
  /**
   * 原图尺寸（宽x高）
   */
  originalSize: string;
  /**
   * 瓦片输出根目录（绝对路径）
   */
  outputPath: string;
  /**
   * 是否被中途停止
   */
  stopped: boolean;
  /**
   * 已生成瓦片数量
   */
  tilesGenerated: number;
}

export interface SliceImageController {
  /**
   * 获取结果；未完成时抛错。与直接读 result 的区别是语义明确。
   */
  getResult: () => SliceImageResult;
  /**
   * 是否正在切片
   */
  readonly isRunning: boolean;
  /**
   * 是否已被停止（stop() 调用后为 true，重新 start() 会复位）
   */
  readonly isStopped: boolean;
  /**
   * 本次（或最近一次）运行的 Promise；未 start 时为 null。
   * 等待结果请 `await controller.start()` 或 `await controller.promise`。
   */
  readonly promise: null | Promise<SliceImageResult>;
  /**
   * 最近一次运行的结果；未运行完时为 null
   */
  readonly result: null | SliceImageResult;
  /**
   * 开始切片（同步返回，不阻塞）。
   * 重复调用返回同一个运行中的 Promise；上一次运行结束后调用则开启新的一轮。
   */
  start: () => Promise<SliceImageResult>;
  /**
   * 停止切片：跳过后续层级和未开始的瓦片任务。
   * Promise 不会 reject，而是以已完成部分正常 resolve（result.stopped === true，
   * 已生成的瓦片文件保留）。未 start 或已结束时调用无效果。
   */
  stop: () => void;
  /**
   * 已生成瓦片数量（实时）
   */
  readonly tilesGenerated: number;
}

/**
 * 切图，生成 XYZ 瓦片
 *
 * 同步返回一个包含 start/stop 的控制对象，方便外部控制切片的开始与中止：
 *
 * ```ts
 * const task = sliceImage({ imagePath: './merged_image.png', outputPath: './maps' });
 * task.start();            // 开始切片（不阻塞）
 * // ...任意时刻
 * task.stop();             // 停止：跳过后续层级/瓦片，Promise 以已完成部分 resolve
 * const res = await task.promise; // { tilesGenerated, stopped, ... }
 * ```
 *
 * 一次性切片（无需中途停止）可直接：
 * `const res = await sliceImage({ ... }).start();`
 *
 * @param options 切片选项配置
 * @returns 切片控制器
 */
export function sliceImage(options: SliceImageOptions): SliceImageController {
  const defaultOptions = {
    outputPath: './maps',
    tileSize: 256,
    minZoom: 8,
    concurrency: 10,
    tileExt: 'png',
    sharpPixelLimit: 1_000_000_000,
    quality: 80,
    imagePath: './merged_image.png',
    compressionLevel: 6,
  };

  const mergeOptions = merge(defaultOptions, options);

  let generatedTiles = 0;
  let stopped = false;
  let running = false;
  let activeRun: null | Promise<SliceImageResult> = null;
  let lastResult: null | SliceImageResult = null;

  async function runOnce(): Promise<SliceImageResult> {
    // 复位上一轮状态
    generatedTiles = 0;
    stopped = false;
    lastResult = null;

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
    const longestSide = Math.max(originW, originH);
    const minZoom = mergeOptions.minZoom;
    const minTileIndex = 2 ** (minZoom - 1) - 1;
    const maxZoom = Math.max(
      minZoom,
      minZoom + Math.ceil(Math.log2(longestSide / mergeOptions.tileSize)),
    );

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
        pipeline = pipeline.png({
          compressionLevel: mergeOptions.compressionLevel,
          adaptiveFiltering: false,
        });
      }

      return pipeline.toFile(tilePath);
    };

    for (let z = minZoom; z <= maxZoom; z++) {
      // 已停止：跳过后续所有层级
      if (stopped) break;

      const scaleFactor = 1 / 2 ** (maxZoom - z);
      const currW = Math.floor(originW * scaleFactor);
      const currH = Math.floor(originH * scaleFactor);
      const levelOffset = z - minZoom;
      const startX = minTileIndex * 2 ** levelOffset;
      const startY = minTileIndex * 2 ** levelOffset;

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

      // 缩放耗时较长，完成后再检查一次停止标记
      if (stopped) break;

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
          fs.mkdir(path.join(zDirRoot, String(startX + x)), {
            recursive: true,
          }),
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
              // 已停止：跳过未开始的瓦片任务
              if (stopped) return;
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
                const outputX = startX + x;
                const outputY = startY + y;
                const tilePath = path.join(
                  absoluteOutRoot,
                  String(z),
                  String(outputX),
                  `${outputY}.${mergeOptions.tileExt}`,
                );

                await encodeTile(finalBuffer, finalW, finalH, tilePath);
                generatedTiles++;

                if (mergeOptions?.onTick) {
                  mergeOptions.onTick({ z, x: outputX, y: outputY });
                }
              } catch {}
            }),
          );
        }
      }

      await Promise.all(tasks);
    }

    lastResult = {
      outputPath: absoluteOutRoot,
      tilesGenerated: generatedTiles,
      originalSize: `${originW}x${originH}`,
      minZoom,
      maxZoom,
      stopped,
    };
    return lastResult;
  }

  const controller: SliceImageController = {
    get tilesGenerated() {
      return generatedTiles;
    },
    get isRunning() {
      return running;
    },
    get isStopped() {
      return stopped;
    },
    get promise() {
      return activeRun;
    },
    get result() {
      return lastResult;
    },
    getResult() {
      if (!lastResult) {
        throw new Error(
          running ? '切片尚未完成' : '切片尚未开始（请先调用 start()）',
        );
      }
      return lastResult;
    },
    start() {
      // 运行中重复调用：返回同一个 Promise
      if (activeRun && running) {
        return activeRun;
      }
      running = true;
      activeRun = runOnce().finally(() => {
        running = false;
      });
      return activeRun;
    },
    stop() {
      // 未在运行则无效果
      if (!running || stopped) {
        return;
      }
      stopped = true;
    },
  };

  return controller;
}
