import type { CreateTilesOptions, MergeImagesOptions } from './types';

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 图片合并结果类型
interface MergeResult {
  mergedSize: string;
  message?: string;
  outputPath: string;
  status: 'error' | 'success';
}

// 瓦片地图生成结果类型
interface TileResult {
  message?: string;
  outputPath: string;
  status: 'error' | 'success';
  tilesGenerated: number;
}

// 获取当前模块路径（兼容 ES Modules）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 获取 Python 脚本路径的函数
const getPythonScriptPath = (scriptName: string) => {
  // 首先尝试从当前包目录查找
  const localPath = path.join(__dirname, '../../python', scriptName);

  // 如果找不到，可以考虑从全局安装位置查找
  return localPath;
};

/**
 * 合并图片
 * @param options 合并图片的配置选项
 * @returns 包含合并结果的Promise
 */
export function mergeImages(options: MergeImagesOptions): Promise<MergeResult> {
  return new Promise((resolve, reject) => {
    // 配置默认值
    const defaultConfig: MergeImagesOptions = {
      imagesPath: '/images',
      outputPath: '/merged_image.jpg',
      direction: 'horizontal',
      imagesPerRow: 64,
      imageWidth: 256,
      imageHeight: 256,
    };
    // 合并
    const mergeConfig = { ...defaultConfig, ...options };

    // 将配置转换为JSON字符串
    const configString = JSON.stringify(mergeConfig);

    // 执行Python脚本
    const pythonProcess = spawn('python', [
      getPythonScriptPath('image_merger.py'),
      configString,
    ]);

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        const errorMsg = `Python process exited with code ${code}: ${errorOutput}`;
        reject(new Error(errorMsg));
        return;
      }

      try {
        const result: MergeResult = JSON.parse(output);

        if (result.status === 'success') {
          resolve(result);
        } else {
          const errorMsg = result.message || '图片合并失败';
          reject(new Error(errorMsg));
        }
      } catch (parseError) {
        const errorMsg = `解析Python输出失败: ${parseError instanceof Error ? parseError.message : String(parseError)}`;
        reject(new Error(errorMsg));
      }
    });
  });
}

/**
 * 生成瓦片地图
 * @param options 生成瓦片地图的配置选项
 * @returns 包含生成结果的Promise
 */
export function createTiles(options: CreateTilesOptions): Promise<TileResult> {
  return new Promise((resolve, reject) => {
    // 配置默认值
    const defaultConfig: CreateTilesOptions = {
      imagesPath: '/merged_image.jpg',
      outputPath: '/maps',
      tileSize: 256,
    };

    const mergeConfig = { ...defaultConfig, ...options };

    // 将配置转换为JSON字符串
    const configString = JSON.stringify(mergeConfig);

    // 执行Python脚本
    const pythonProcess = spawn('python', [
      getPythonScriptPath('create_tiles.py'),
      configString,
    ]);

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        const errorMsg = `Python process exited with code ${code}: ${errorOutput}`;
        reject(new Error(errorMsg));
        return;
      }

      try {
        const result: TileResult = JSON.parse(output);

        if (result.status === 'success') {
          resolve(result);
        } else {
          const errorMsg = result.message || '瓦片地图生成失败';
          reject(new Error(errorMsg));
        }
      } catch (parseError) {
        const errorMsg = `解析Python输出失败: ${parseError instanceof Error ? parseError.message : String(parseError)}`;
        reject(new Error(errorMsg));
      }
    });
  });
}
