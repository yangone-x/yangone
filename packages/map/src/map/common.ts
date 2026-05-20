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
  ext: string = 'png',
): ImageWithFilename[] {
  if (low >= high) {
    throw new Error(`起始索引必须小于结束索引: low=${low}, high=${high}`);
  }

  const urls: [string, string][] = [];

  for (let i = low; i < high; ++i) {
    for (let j = low; j < high; ++j) {
      const targetUrl = url.replace('{x}', String(i)).replace('{y}', String(j));
      urls.push([targetUrl, `${i - low}_${j - low}.${ext}`]);
    }
  }
  return urls;
}
