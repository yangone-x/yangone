import type { ImageWithFilename } from './types';

/**
 * 生成地图图片地址列表
 * @param low 起始索引
 * @param high 结束索引（不包含）
 * @param url url 地址
 * @returns 图片URL和对应文件名的二维数组
 */
export function genImageUrls(
  low: number,
  high: number,
  url: string,
): ImageWithFilename[] {
  if (low >= high) {
    throw new Error(`起始索引必须小于结束索引: low=${low}, high=${high}`);
  }

  const urls: [string, string][] = [];
  let k = 1;
  const totalImages = (high - low) ** 2;
  const zeroPadding = totalImages.toString().length;

  for (let i = low; i < high; ++i) {
    for (let j = low; j < high; ++j) {
      const targetUrl = replacePlaceholders(url, i, j);
      const imgName = k.toString().padStart(zeroPadding, '0');
      urls.push([targetUrl, `${imgName}.jpg`]);
      k++;
    }
  }
  return urls;
}

function replacePlaceholders(url: string, low: number, high: number) {
  // 计算两个占位符的起始索引
  const lowIndex = url.indexOf('@{low}');
  const highIndex = url.indexOf('@{high}');

  return `${url.slice(0, lowIndex)}${low}${url.slice(lowIndex + 6, highIndex)}${high}${url.slice(highIndex + 7)}`;
}
