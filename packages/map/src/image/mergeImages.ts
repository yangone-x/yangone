import { Buffer } from 'node:buffer';
import fs from 'node:fs/promises';
import path from 'node:path';

import { merge } from 'lodash-es';
import sharp from 'sharp';

export interface MergeImagesOptions {
  /**
   * 列数
   * @default 64
   */
  cols?: number;
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
   * 输出格式
   * @default "png"
   */
  outputFormat?: 'jpg' | 'png' | 'webp';
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
 * 合成图片
 * @param options 合成图片参数
 * @returns
 */
export async function mergeImages(options: MergeImagesOptions) {
  const defaultOptions = {
    cols: 64,
    rows: 64,
    imageWidth: 256,
    imageHeight: 256,
    outputPath: './merged_image.png',
    imagePattern: '{x}_{y}.png',
    direction: 'horizontal', // 默认水平排列
    sharpPixelLimit: 1_000_000_000,
    outputFormat: 'png',
    quality: 80,
  };

  const mergeOptions = merge(defaultOptions, options);

  const totalWidth = mergeOptions.cols * mergeOptions.imageWidth;
  const totalHeight = mergeOptions.rows * mergeOptions.imageHeight;

  const isHorizontal = mergeOptions.direction === 'horizontal';

  // 主循环次数：如果是 horizontal 则是行数，如果是 vertical 则是列数
  const mainLoopCount = isHorizontal ? mergeOptions.rows : mergeOptions.cols;
  // 子循环次数：如果是 horizontal 则是列数，如果是 vertical 则是行数
  const subLoopCount = isHorizontal ? mergeOptions.cols : mergeOptions.rows;

  // 存储每一行的 Buffer，最后一次性垂直拼接
  const stripBuffers: Buffer[] = [];

  // 预计算每个像素的字节数 (RGBA = 4)
  const channels = 4;
  const stripSize = totalWidth * mergeOptions.imageHeight * channels;

  for (let i = 0; i < mainLoopCount; i++) {
    const composites: sharp.OverlayOptions[] = [];
    let hasValidTile = false;

    for (let j = 0; j < subLoopCount; j++) {
      let x: number;
      let y: number;

      if (isHorizontal) {
        // 行优先: 第 i 行, 第 j 列
        x = j;
        y = i;
      } else {
        // 列优先: 第 i 列, 第 j 行
        x = i;
        y = j;
      }

      const tileName = mergeOptions.imagePattern
        .replace('{x}', String(x))
        .replace('{y}', String(y));
      const tilePath = path.join(mergeOptions.imagesPath, tileName);

      try {
        // 检查文件是否存在，存在则加入复合列表
        await fs.access(tilePath);

        composites.push({
          input: tilePath,
          left: j * mergeOptions.imageWidth,
          top: 0,
        });
        hasValidTile = true;
      } catch {
        // 忽略缺失瓦片
      }
    }

    // 生成当前条带的 Raw Buffer
    const rawBuffer: Buffer = hasValidTile
      ? await sharp({
          create: {
            width: totalWidth,
            height: mergeOptions.imageHeight,
            channels: channels,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          },
        })
          .composite(composites)
          .raw() // 输出原始像素数据
          .toBuffer()
      : Buffer.alloc(stripSize, 0);

    stripBuffers.push(rawBuffer);

    // 进度回调
    if (mergeOptions?.onTick) {
      mergeOptions.onTick({
        process: i + 1,
      });
    }
  }

  if (stripBuffers.length === 0) {
    throw new Error('没有生成任何图像条带');
  }

  // 垂直拼接所有条带
  const finalComposites: sharp.OverlayOptions[] = stripBuffers.map(
    (buf, index) => ({
      input: buf,
      left: 0,
      top: index * mergeOptions.imageHeight,
      raw: {
        width: totalWidth,
        height: mergeOptions.imageHeight,
        channels: channels,
      },
    }),
  );

  // 创建最终图像
  // 基础画布也可以是 raw 的，或者直接创建
  const finalPipeline = sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: channels,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
    limitInputPixels: mergeOptions.sharpPixelLimit,
  });

  // 应用所有条带
  finalPipeline.composite(finalComposites);

  // 根据格式编码输出
  const format = mergeOptions.outputFormat.toLowerCase();
  if (format === 'jpg' || format === 'jpeg') {
    finalPipeline.jpeg({ quality: mergeOptions.quality, progressive: true });
  } else if (format === 'webp') {
    finalPipeline.webp({ quality: mergeOptions.quality, effort: 2 });
  } else {
    // PNG
    finalPipeline.png({
      quality: 100,
      compressionLevel: 6,
      progressive: false,
    });
  }

  await finalPipeline.toFile(mergeOptions.outputPath);

  return {
    outputPath: mergeOptions.outputPath,
    totalWidth,
    totalHeight,
  };
}
