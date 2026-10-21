import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
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
   * 失败文件（可直接回喂 images 重试）
   */
  failFiles: ImageWithFilename[];
  /**
   * 是否被中途停止
   */
  stopped: boolean;
  /**
   * 成功数量
   */
  successCount: number;
}

export interface FetchImagesController {
  /**
   * 失败数量（实时）
   */
  readonly failCount: number;
  /**
   * 获取结果；未完成时抛错。与直接读 result 的区别是语义明确。
   */
  getResult: () => FetchImagesResult;
  /**
   * 是否正在下载
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
  readonly promise: null | Promise<FetchImagesResult>;
  /**
   * 最近一次运行的结果；未运行完时为 null
   */
  readonly result: FetchImagesResult | null;
  /**
   * 开始下载（同步返回，不阻塞）。
   * 重复调用返回同一个运行中的 Promise；上一次运行结束后调用则开启新的一轮。
   */
  start: () => Promise<FetchImagesResult>;
  /**
   * 停止下载：中断进行中的请求并跳过未开始的任务。
   * Promise 不会 reject，而是以已完成部分正常 resolve（result.stopped === true，
   * 未下载/被中断的任务记入 failFiles，可回喂重试）。
   * 未 start 或已结束时调用无效果。
   */
  stop: () => void;
  /**
   * 成功数量（实时）
   */
  readonly successCount: number;
}

function createAbortError(message: string): Error {
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

/**
 * 批量下载图片到本地
 *
 * 同步返回一个包含 start/stop 的控制对象，方便外部控制下载的开始与中止：
 *
 * ```ts
 * const task = fetchImages({ images: urls, outputPath: './out' });
 * task.start();            // 开始下载（不阻塞）
 * // ...任意时刻
 * task.stop();             // 停止：中断进行中的请求，Promise 以已完成部分 resolve
 * const res = await task.promise; // { successCount, failCount, failFiles, stopped }
 * ```
 *
 * 一次性下载（无需中途停止）可直接：
 * `const res = await fetchImages({ ... }).start();`
 *
 * @param options 下载选项配置
 * @returns 下载控制器
 */
export function fetchImages(
  options: FetchImagesOptions,
): FetchImagesController {
  // 默认配置项
  const defaultOptions = {
    autoRename: false,
    concurrency: 10,
    timeout: 30_000, // 30秒超时
    outputPath: './images',
  };
  const mergeOptions = merge(defaultOptions, options);

  let successCount = 0;
  let failCount = 0;
  let failFiles: ImageWithFilename[] = [];
  let stopped = false;
  let running = false;
  let activeRun: null | Promise<FetchImagesResult> = null;
  let lastResult: FetchImagesResult | null = null;
  // 本轮运行的全局中止信号（stop() 时 abort）
  let globalAbort: AbortController | null = null;
  let keepAliveAgents: null | { http: http.Agent; https: https.Agent } = null;

  function signal(): AbortSignal {
    if (!globalAbort) {
      globalAbort = new AbortController();
    }
    return globalAbort.signal;
  }

  // 按 URL 协议选择 keep-alive agent（https.Agent 不能用于 http: 请求）
  function agentFor(url: string): http.Agent | https.Agent | undefined {
    if (!keepAliveAgents) {
      return undefined;
    }
    try {
      return new URL(url).protocol === 'http:'
        ? keepAliveAgents.http
        : keepAliveAgents.https;
    } catch {
      return keepAliveAgents.https;
    }
  }

  async function runOnce(): Promise<FetchImagesResult> {
    // 复位上一轮状态
    successCount = 0;
    failCount = 0;
    failFiles = [];
    stopped = false;
    lastResult = null;

    keepAliveAgents = {
      https: new https.Agent({
        keepAlive: true,
        maxSockets: mergeOptions.concurrency + 5,
      }),
      http: new http.Agent({
        keepAlive: true,
        maxSockets: mergeOptions.concurrency + 5,
      }),
    };

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

          // 已停止：不再发起新请求，任务记入失败列表（failFiles 可回喂重试）
          if (stopped) {
            failCount++;
            const itemUrl = Array.isArray(item) ? item[0] : String(item);
            const skippedName =
              (Array.isArray(item) ? item[1] : null) ||
              (itemUrl ? path.basename(itemUrl) : `unknown_${index}`);
            failFiles.push([itemUrl, skippedName]);
            if (typeof mergeOptions.onTickError === 'function') {
              mergeOptions.onTickError({
                url: itemUrl,
                filename: skippedName,
                error: '下载任务已停止',
              });
            }
            if (typeof mergeOptions.onTick === 'function') {
              mergeOptions.onTick({ url: itemUrl, filename: skippedName });
            }
            return;
          }

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

            // 发送HEAD请求获取文件信息，独立的超时控制 + 全局停止信号
            const headController = new AbortController();
            const onHeadAbort = () =>
              headController.abort(createAbortError('下载任务已停止'));
            if (signal().aborted) {
              onHeadAbort();
            } else {
              signal().addEventListener('abort', onHeadAbort, { once: true });
            }
            const headTimeout = setTimeout(
              () => headController.abort(createAbortError('HEAD请求超时')),
              mergeOptions.timeout,
            );

            try {
              const headResponse = await fetch(url, {
                method: 'HEAD',
                agent: agentFor(url),
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
              signal().removeEventListener('abort', onHeadAbort);
            }

            // 下载文件内容
            const downloadController = new AbortController();
            const onDownloadAbort = () =>
              downloadController.abort(createAbortError('下载任务已停止'));
            if (signal().aborted) {
              onDownloadAbort();
            } else {
              signal().addEventListener('abort', onDownloadAbort, {
                once: true,
              });
            }
            const downloadTimeout = setTimeout(
              () =>
                downloadController.abort(createAbortError('下载请求超时')),
              mergeOptions.timeout,
            );

            try {
              const fullResponse = await fetch(url, {
                agent: agentFor(url),
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
              signal().removeEventListener('abort', onDownloadAbort);
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
      keepAliveAgents?.https.destroy();
      keepAliveAgents?.http.destroy();
      keepAliveAgents = null;
      globalAbort = null;
    }

    lastResult = {
      successCount,
      failCount,
      failFiles,
      stopped,
    };
    return lastResult;
  }

  const controller: FetchImagesController = {
    get failCount() {
      return failCount;
    },
    get successCount() {
      return successCount;
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
          running ? '下载尚未完成' : '下载尚未开始（请先调用 start()）',
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
      // 中断进行中的请求；未开始的任务会在调度时直接跳过
      if (globalAbort && !globalAbort.signal.aborted) {
        globalAbort.abort(createAbortError('下载任务已停止'));
      }
    },
  };

  return controller;
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
