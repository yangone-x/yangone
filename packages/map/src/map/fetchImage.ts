import type { ImageData, ImageUrl, ImageWithFilename } from './types';

import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { URL } from 'node:url';

import merge from 'lodash.merge';
import fetch from 'node-fetch';

interface DownloadOptions {
  /**
   * 自动重命名
   * @default false
   */
  autoRename?: boolean;
  /**
   * 最大并发下载数
   * @default 5
   */
  concurrency?: number;
  onTick?: ({ url, filename }: { filename: string; url: string }) => void;
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
   * 超时
   * @default 30000
   */
  timeout?: number;
}

export interface DownloadResult {
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
 * @param saveFolder 保存文件夹路径
 * @param options 下载选项配置
 * @returns 下载结果统计
 */
export async function downloadImages(
  imageData: ImageData,
  saveFolder = '/images',
  options: DownloadOptions = {},
): Promise<DownloadResult> {
  // 默认配置项
  const defaultOptions = {
    autoRename: false,
    concurrency: 5,
    timeout: 30_000, // 30秒超时
  };
  const mergeOptions = merge(defaultOptions, options);

  const keepAliveAgent = new https.Agent({
    keepAlive: true,
    maxSockets: mergeOptions.concurrency * 2,
  });

  let successCount = 0;
  let failCount = 0;
  const failFiles: [string, string][] = [];

  try {
    // 任务队列
    const taskQueue: Array<
      [index: number, item: ImageUrl | ImageWithFilename]
    > = imageData
      .map((item, index): [number, ImageUrl | ImageWithFilename] => [
        index,
        item,
      ])
      .toReversed();

    let activeWorkers = 0;

    // 单个下载任务处理函数
    const processDownloadTask = async () => {
      while (taskQueue.length > 0) {
        const currentTask = taskQueue.pop();
        if (!currentTask) continue;

        const [index, item] = currentTask;
        let url: string = '';
        let filename: null | string = null;

        try {
          activeWorkers++;

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

          // 处理文件名冲突
          let savePath = path.join(saveFolder, filename);
          if (mergeOptions.autoRename) {
            savePath = resolveDuplicateFilename(saveFolder, filename);
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
          failFiles.push([url, filename || path.basename(url)]);

          if (typeof mergeOptions.onTickError === 'function') {
            mergeOptions.onTickError({
              url,
              filename: filename || path.basename(url),
              error: errorMsg,
            });
          }
        } finally {
          if (typeof mergeOptions.onTick === 'function') {
            mergeOptions.onTick({
              url,
              filename: filename || path.basename(url),
            });
          }
          activeWorkers--;
        }
      }
    };

    // 启动工作线程池
    const workerCount = Math.min(mergeOptions.concurrency, imageData.length);
    const workers = Array.from({ length: workerCount }, () =>
      processDownloadTask(),
    );

    // 等待所有任务完成
    await Promise.all(workers);

    // 确保所有工作线程都已结束
    if (activeWorkers > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
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
 * 处理文件名重复
 * @param folder 文件夹
 * @param filename 原始文件名
 * @returns 不重复的文件名路径
 */
function resolveDuplicateFilename(folder: string, filename: string): string {
  let savePath = path.join(folder, filename);
  if (!fs.existsSync(savePath)) {
    return savePath;
  }

  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  let counter = 1;

  while (fs.existsSync(savePath)) {
    savePath = path.join(folder, `${base}_${counter}${ext}`);
    counter++;
  }

  return savePath;
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

    const writer = fs.createWriteStream(filePath);

    readableStream.pipe(writer).on('error', reject).on('finish', resolve);
  });
}
