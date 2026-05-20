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
   * 输出文件路径
   * @default "./merged_image.png"
   */
  outputPath?: string;
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

  for (let i = 0; i < mainLoopCount; i++) {
    const composites: sharp.OverlayOptions[] = [];

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
        await fs.access(tilePath);

        composites.push({
          input: tilePath,
          left: j * mergeOptions.imageWidth,
          top: 0,
        });
      } catch {
        // 忽略缺失瓦片
      }
    }

    // 生成当前条带 (Strip)
    if (composites.length > 0) {
      // 创建当前条带的画布
      const stripBuffer = await sharp({
        create: {
          width: totalWidth,
          height: mergeOptions.imageHeight,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite(composites)
        .png({ compressionLevel: 1 })
        .toBuffer();

      stripBuffers.push(stripBuffer);
    } else {
      // 如果整个条带都为空，创建一个空的透明缓冲区
      const emptyStrip = await sharp({
        create: {
          width: totalWidth,
          height: mergeOptions.imageHeight,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .png()
        .toBuffer();
      stripBuffers.push(emptyStrip);
    }

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
    }),
  );

  // 创建最终图像
  await sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
    limitInputPixels: mergeOptions.sharpPixelLimit,
  })
    .composite(finalComposites)
    .png({ compressionLevel: 9 }) // 最终输出高压缩
    .toFile(mergeOptions.outputPath);

  return {
    outputPath: mergeOptions.outputPath,
    totalWidth,
    totalHeight,
  };
}
