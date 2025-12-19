import { promises as fs } from 'node:fs';

/**
 * 读取 JSON 文件
 */
export async function readJSON<T = any>(filePath: string) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data) as T;
  } catch (error) {
    console.error('Error reading JSON file:', error);
    throw error;
  }
}

export async function writeJSON(filePath: string, data: any) {
  try {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing JSON file:', error);
    throw error;
  }
}
