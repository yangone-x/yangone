import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import { URL } from 'node:url';

import { merge } from 'lodash-es';
import fetch from 'node-fetch';
import pLimit from 'p-limit';

export type ImageUrl = string;
export type ImageWithFilename = [url: string, filename: string];

export type ImageData = ImageUrl[] | ImageWithFilename[];

export interface FetchImagesOptions {
  /**
   * 最大并发下载数
   * @default 10
   */
  concurrency?: number;
  /**
   * 下载图片数据
   */
  images: ImageData;
  /**
   * 进度回调
   */
  onTick?: ({ url, filename }: { filename: string; url: string }) => void;
  /**
   * 失败进度回调
   */
  onTickError?: ({
    url,
    filename,
    error,
  }: {
    error: string;
    filename: string;
    url: string;
  }) => void;
  /**
   * 瓦片保存路径
   * @default './images'
   */
  outputPath?: string;
  /**
   * 超时
   * @default 30000
   */
  timeout?: number;
}

export interface FetchImagesResult {
  /**
   * 失败数量
   */
  failCount: number;
  /**
   * 失败文件
   */
  failFiles: ImageWithFilename[];
  /**
   * 成功数量
   */
  successCount: number;
}

/**
 * 批量下载图片到本地
 * @param imageData 图片数据，可以是URL数组或[URL, 文件名]元组数组
 * @param options 下载选项配置
 * @returns 下载结果统计
 */
export async function fetchImages(
  options: FetchImagesOptions,
): Promise<FetchImagesResult> {
  // 默认配置项
  const defaultOptions = {
    autoRename: false,
    concurrency: 10,
    timeout: 30_000, // 30秒超时
    outputPath: './images',
  };
  const mergeOptions = merge(defaultOptions, options);

  const keepAliveAgent = new https.Agent({
    keepAlive: true,
    maxSockets: mergeOptions.concurrency + 5,
  });

  let successCount = 0;
  let failCount = 0;
  const failFiles: [string, string][] = [];

  // 创建并发限制器
  const limit = pLimit(mergeOptions.concurrency);
  const absoluteOutRoot = path.resolve(mergeOptions.outputPath);
  // 预创建根目录
  await fs.mkdir(absoluteOutRoot, { recursive: true });

  try {
    // 映射所有下载任务
    const tasks = mergeOptions.images.map((item, index) => {
      return limit(async () => {
        let url: string = '';
        let filename: null | string = null;

        try {
          // 解析下载项
          if (Array.isArray(item) && item.length === 2) {
            [url, filename] = item;
          } else if (typeof item === 'string') {
            url = item;
            filename = null;
          } else {
            throw new TypeError('无效的图片数据格式');
          }

          // 验证URL有效性
          if (!URL.canParse(url)) {
            throw new Error(`无效的URL格式: ${url}`);
          }

          // 发送HEAD请求获取文件信息，设置独立的超时控制
          const headController = new AbortController();
          const headTimeout = setTimeout(
            () => headController.abort(),
            mergeOptions.timeout,
          );

          try {
            const headResponse = await fetch(url, {
              method: 'HEAD',
              agent: keepAliveAgent,
              signal: headController.signal,
            });

            if (!headResponse.ok) {
              throw new Error(`HEAD请求失败: HTTP ${headResponse.status}`);
            }

            // 生成文件名（如果未指定）
            if (!filename) {
              filename = generateFilename(
                url,
                index,
                headResponse.headers.get('content-type') ?? '',
              );
            }
          } finally {
            clearTimeout(headTimeout);
          }

          // 下载文件内容
          const downloadController = new AbortController();
          const downloadTimeout = setTimeout(
            () => downloadController.abort(),
            mergeOptions.timeout,
          );

          try {
            const fullResponse = await fetch(url, {
              agent: keepAliveAgent,
              signal: downloadController.signal,
            });

            if (!fullResponse.ok) {
              throw new Error(`下载失败: HTTP ${fullResponse.status}`);
            }
            // 图片保存路径
            const savePath = path.join(mergeOptions.outputPath, filename);
            // 流式写入文件
            await streamToFile(fullResponse.body, savePath);
            successCount++;
          } finally {
            clearTimeout(downloadTimeout);
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          failCount++;
          // 确保即使出错也能记录文件名，如果之前没生成则尝试从URL获取
          const finalFilename =
            filename || (url ? path.basename(url) : `unknown_${index}`);
          failFiles.push([url, finalFilename]);

          if (typeof mergeOptions.onTickError === 'function') {
            mergeOptions.onTickError({
              url,
              filename: finalFilename,
              error: errorMsg,
            });
          }
        } finally {
          if (typeof mergeOptions.onTick === 'function') {
            // 确保回调中使用的文件名是最终确定的
            const finalFilename =
              filename || (url ? path.basename(url) : `unknown_${index}`);
            mergeOptions.onTick({
              url,
              filename: finalFilename,
            });
          }
        }
      });
    });

    // 等待所有任务完成
    await Promise.all(tasks);
  } finally {
    keepAliveAgent.destroy();
  }

  return { successCount, failCount, failFiles };
}

/**
 * 生成文件名
 * @param url 图片URL
 * @param index 索引
 * @param contentType 内容类型
 * @returns 生成的文件名
 */
function generateFilename(
  url: string,
  index: number,
  contentType?: string,
): string {
  const urlObj = new URL(url);
  let filename = path.basename(urlObj.pathname) || `image_${index + 1}`;

  // 根据内容类型补充扩展名
  if (!path.extname(filename) && contentType) {
    const ext = contentType.split(';')[0]?.split('/')[1];
    if (ext) {
      filename += `.${ext === 'jpeg' ? 'jpg' : ext}`;
    }
  }

  return filename;
}

/**
 * 将流写入文件
 * @param readableStream 可读流
 * @param filePath 文件路径
 * @returns 写入完成的Promise
 */
function streamToFile(
  readableStream: NodeJS.ReadableStream | null,
  filePath: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!readableStream) {
      reject(new Error('响应流为空'));
      return;
    }

    const writer = fsSync.createWriteStream(filePath);

    readableStream.pipe(writer).on('error', reject).on('finish', resolve);
  });
}
