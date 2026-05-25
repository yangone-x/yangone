import { Buffer } from 'node:buffer';
import fs from 'node:fs/promises';
import path from 'node:path';

import { merge } from 'lodash-es';
import pLimit from 'p-limit';
import sharp from 'sharp';

export interface MergeImagesOptions {
  /**
   * 列数
   * @default 64
   */
  cols?: number;
  /**
   * 最大并发
   * @default 10
   */
  concurrency?: number;
  /**
   * 排列方向
   * @default "horizontal"
   * - horizontal: 行优先填充 (从左到右，从上到下)
   * - vertical: 列优先填充 (从上到下，从左到右)
   */
  direction?: 'horizontal' | 'vertical';
  /**
   * 图片高度
   * @default 256
   */
  imageHeight?: number;
  /**
   * 图片文件名规则
   * @default "{x}_{y}.png"
   */
  imagePattern?: string;
  /**
   * 切片路径
   */
  imagesPath: string;
  /**
   * 图片宽度
   * @default 256
   */
  imageWidth?: number;
  /**
   * 进度回调
   */
  onTick?: ({ process }: { process: number }) => void;
  /**
   * 输出文件路径
   * @default "./merged_image.png"
   */
  outputPath?: string;
  /**
   * 输出质量
   * @default 80
   */
  quality?: number;
  /**
   * 行数
   * @default 64
   */
  rows?: number;
  /**
   * Sharp 的像素限制
   * @default 1_000_000_000
   */
  sharpPixelLimit?: number;
}

/**
 * 合成图片 (优化内存版)
 * @param options 合成图片参数
 * @returns
 */
export async function mergeImages(options: MergeImagesOptions) {
  // 默认配置
  const defaultOptions = {
    cols: 64,
    rows: 64,
    imageWidth: 256,
    imageHeight: 256,
    outputPath: './merged_image.png',
    imagePattern: '{x}_{y}.png',
    direction: 'horizontal', // 默认水平排列
    sharpPixelLimit: 1_000_000_000,
    quality: 80,
    concurrency: 10,
  };

  const mergeOptions = merge(defaultOptions, options);
  // 创建并发限制器
  const limit = pLimit(mergeOptions.concurrency);

  // 计算最终合成图片的总宽度和总高度
  const totalWidth = mergeOptions.cols * mergeOptions.imageWidth;
  const totalHeight = mergeOptions.rows * mergeOptions.imageHeight;

  // 判断排列方向
  const isHorizontal = mergeOptions.direction === 'horizontal';

  // 主循环次数：如果是 horizontal 则是行数，如果是 vertical 则是列数
  const mainLoopCount = isHorizontal ? mergeOptions.rows : mergeOptions.cols;
  // 子循环次数
  const subLoopCount = isHorizontal ? mergeOptions.cols : mergeOptions.rows;

  // RGBA 通道数
  const channels = 4;

  // 预扫描所有存在的瓦片路径
  const existingTiles = new Map<string, string>();
  const checkTasks = [];

  for (let y = 0; y < mergeOptions.rows; y++) {
    for (let x = 0; x < mergeOptions.cols; x++) {
      const tileName = mergeOptions.imagePattern
        .replace('{x}', String(x))
        .replace('{y}', String(y));
      const tilePath = path.join(mergeOptions.imagesPath, tileName);

      checkTasks.push(
        fs
          .access(tilePath)
          .then(() => {
            existingTiles.set(`${x}_${y}`, tilePath);
          })
          .catch(() => {}),
      );
    }
  }
  await Promise.all(checkTasks);

  // 确定输出格式
  const format = mergeOptions.outputPath.split('.').pop()?.toLowerCase();

  // 分配最终图像的原始 Buffer 空间
  // 警告：如果此分配失败，说明图像太大，无法在内存中处理，需要改用基于磁盘的切片合并工具或更低级的流式库。
  let finalRawBuffer = Buffer.alloc(totalWidth * totalHeight * channels, 0);

  /**
   * 处理单个条带并直接写入最终 Buffer
   */
  const processAndMergeStrip = async (i: number): Promise<void> => {
    const composites: sharp.OverlayOptions[] = [];

    for (let j = 0; j < subLoopCount; j++) {
      let x: number;
      let y: number;

      if (isHorizontal) {
        x = j;
        y = i;
      } else {
        x = i;
        y = j;
      }

      const key = `${x}_${y}`;
      const tilePath = existingTiles.get(key);

      if (tilePath) {
        composites.push({
          input: tilePath,
          left: j * mergeOptions.imageWidth,
          top: 0,
        });
      }
    }

    let stripBuffer: Buffer;
    if (composites.length === 0) {
      // 如果没有瓦片，不需要做任何事，因为 finalRawBuffer 已经初始化为 0 (透明)
      return;
    } else {
      // 创建当前条带的图像并获取 Raw Buffer
      stripBuffer = await sharp({
        create: {
          width: totalWidth,
          height: mergeOptions.imageHeight,
          channels,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite(composites)
        .raw()
        .toBuffer();
    }

    // 计算偏移量并直接拷贝到最终 Buffer
    const offset = i * totalWidth * mergeOptions.imageHeight * channels;
    stripBuffer.copy(finalRawBuffer, offset);

    // 显式释放引用，帮助 GC
    // eslint-disable-next-line no-useless-assignment
    stripBuffer = null as any;
  };

  // 创建所有任务
  const tasks = [];
  for (let i = 0; i < mainLoopCount; i++) {
    tasks.push(
      limit(async () => {
        await processAndMergeStrip(i);

        // 触发进度回调
        if (mergeOptions?.onTick) {
          mergeOptions.onTick({ process: i + 1 });
        }
      }),
    );
  }

  // 等待所有处理完成
  await Promise.all(tasks);

  // 此时 finalRawBuffer 已包含完整图像数据，stripBuffers 不再需要

  // 创建 Sharp 管道进行编码
  let pipeline = sharp(finalRawBuffer, {
    raw: {
      width: totalWidth,
      height: totalHeight,
      channels,
    },
    limitInputPixels: mergeOptions.sharpPixelLimit,
  });

  // 根据格式进行编码配置
  if (format === 'jpg' || format === 'jpeg') {
    pipeline = pipeline.jpeg({
      quality: mergeOptions.quality,
      progressive: true,
    });
  } else if (format === 'webp') {
    pipeline = pipeline.webp({ quality: mergeOptions.quality, effort: 2 });
  } else {
    // 默认 PNG
    pipeline = pipeline.png({
      compressionLevel: 6,
      adaptiveFiltering: false,
    });
  }

  // 写入文件
  await pipeline.toFile(mergeOptions.outputPath);

  // 释放最终 Buffer 引用（虽然函数即将结束）
  finalRawBuffer = null as any;

  return {
    outputPath: mergeOptions.outputPath,
    totalWidth,
    totalHeight,
  };
}
