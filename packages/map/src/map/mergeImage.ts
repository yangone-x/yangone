import buffer from 'node:buffer';
import fs from 'node:fs/promises';
import path from 'node:path';

import merge from 'lodash.merge';
import sharp from 'sharp';

interface MergeImagesOptions {
  cols?: number;
  imageHeight?: number;
  imagePattern?: string;
  imagesDir: string;
  imageWidth?: number;
  onTick?: ({ row, rows }: { row: number; rows: number }) => void;
  outputPath?: string;
  rows?: number;
}

export async function mergeImagesAdvanced(options: MergeImagesOptions) {
  const defaultOptions = {
    cols: 64,
    rows: 64,
    imageWidth: 256,
    imageHeight: 256,
    outputPath: './merged_image.png',
    imagePattern: '{x}_{y}.png',
  };

  const mergeOptions = merge(defaultOptions, options);

  const totalWidth = mergeOptions.cols * mergeOptions.imageWidth;
  const totalHeight = mergeOptions.rows * mergeOptions.imageHeight;

  const rowBuffers: buffer.Buffer<ArrayBufferLike>[] = [];

  // 逐行合并
  for (let y = 0; y < mergeOptions.rows; y++) {
    const rowComposites: sharp.OverlayOptions[] = [];

    // 构建当前行的复合列表
    for (let x = 0; x < mergeOptions.cols; x++) {
      const tileName = mergeOptions.imagePattern
        .replace('{x}', String(x))
        .replace('{y}', String(y));
      const tilePath = path.join(mergeOptions.imagesDir, tileName);

      try {
        await fs.access(tilePath);
        rowComposites.push({
          input: tilePath,
          left: x * mergeOptions.imageWidth,
          top: 0,
        });
      } catch {
        // 忽略缺失瓦片
      }
    }

    if (rowComposites.length > 0) {
      const rowBuffer = await sharp({
        create: {
          width: totalWidth,
          height: mergeOptions.imageHeight,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite(rowComposites)
        .png({ compressionLevel: 1 }) // 使用最低压缩级别以加快速度，因为只是中间数据
        .toBuffer();

      rowBuffers.push(rowBuffer);
    } else {
      // 如果整行都为空，创建一个空的透明 PNG 缓冲区
      const emptyRow = await sharp({
        create: {
          width: totalWidth,
          height: mergeOptions.imageHeight,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .png()
        .toBuffer();
      rowBuffers.push(emptyRow);
    }

    // if ((y + 1) % 10 === 0) {
    //   // console.log(`⏳ 已处理 ${y + 1}/${rows} 行`);
    // }
    console.log(`⏳ 已处理 ${y + 1}/${rows} 行`);
  }

  // console.log('🔗 正在垂直拼接所有行...');

  // 垂直拼接所有行
  const finalComposites: sharp.OverlayOptions[] = rowBuffers.map(
    (buf, index) => ({
      input: buf,
      left: 0,
      top: index * mergeOptions.imageHeight,
    }),
  );

  await sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(finalComposites)
    .toFile(mergeOptions.outputPath);
}
