import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

// 定义日志级别类型
type LogLevel = 'debug' | 'error' | 'fatal' | 'info' | 'warn';

interface LoggerOptions {
  level?: LogLevel;
  logDir?: string;
}

interface MetaData {
  [key: string]: any;
}

class Logger {
  private level: LogLevel;
  private readonly levels: LogLevel[] = [
    'debug',
    'info',
    'warn',
    'error',
    'fatal',
  ];
  private logDir: string;

  /**
   * 初始化日志工具
   * @param options 配置选项
   */
  constructor(options: LoggerOptions = {}) {
    // 确定日志目录，优先使用选项中的目录，否则使用项目根目录下的logs文件夹
    this.logDir = options.logDir || path.join(this.findProjectRoot(), 'logs');
    this.level = options.level || 'info';

    // 确保日志目录存在
    this.ensureDir().catch((error) => {
      console.error('初始化日志目录失败:', error);
    });
  }

  /**
   * 调试级别日志
   * @param message 日志消息
   * @param meta 附加元数据
   */
  debug(message: string, meta?: MetaData): Promise<void> {
    return this.log('debug', message, meta);
  }

  /**
   * 错误级别日志
   * @param message 日志消息
   * @param meta 附加元数据
   */
  error(message: string, meta?: MetaData): Promise<void> {
    return this.log('error', message, meta);
  }

  /**
   * 致命错误级别日志
   * @param message 日志消息
   * @param meta 附加元数据
   */
  fatal(message: string, meta?: MetaData): Promise<void> {
    return this.log('fatal', message, meta);
  }

  /**
   * 获取当前日志目录
   * @returns 当前日志目录路径
   */
  getLogDir(): string {
    return this.logDir;
  }

  /**
   * 信息级别日志
   * @param message 日志消息
   * @param meta 附加元数据
   */
  info(message: string, meta?: MetaData): Promise<void> {
    return this.log('info', message, meta);
  }

  /**
   * 动态设置日志目录
   * @param newDir 新的日志目录路径
   * @returns 是否设置成功
   */
  async setLogDir(newDir: string): Promise<boolean> {
    if (!newDir) {
      console.error('日志目录不能为空');
      return false;
    }

    try {
      // 解析为绝对路径
      const absolutePath = path.resolve(newDir);
      this.logDir = absolutePath;

      // 确保新目录存在
      await this.ensureDir();
      return true;
    } catch (error) {
      console.error('设置日志目录失败:', error);
      return false;
    }
  }

  /**
   * 动态设置日志级别
   * @param newLevel 新的日志级别
   * @returns 是否设置成功
   */
  setLogLevel(newLevel: LogLevel): boolean {
    if (this.levels.includes(newLevel)) {
      this.level = newLevel;
      return true;
    }
    console.error(`无效的日志级别: ${newLevel}`);
    return false;
  }

  /**
   * 警告级别日志
   * @param message 日志消息
   * @param meta 附加元数据
   */
  warn(message: string, meta?: MetaData): Promise<void> {
    return this.log('warn', message, meta);
  }

  /**
   * 确保日志目录存在，不存在则创建
   */
  private async ensureDir(): Promise<void> {
    if (!existsSync(this.logDir)) {
      try {
        await fs.mkdir(this.logDir, { recursive: true });
      } catch (error) {
        console.error('创建日志目录失败:', error);
        throw error; // 抛出错误以便调用者处理
      }
    }
  }

  /**
   * 查找项目根目录（包含pnpm-lock.yaml的目录）
   * @returns 项目根目录路径
   */
  private findProjectRoot(): string {
    let currentDir = import.meta.dirname;

    // 向上查找，直到找到pnpm-lock.yaml或到达文件系统根目录
    while (true) {
      const packageJsonPath = path.join(currentDir, 'pnpm-lock.yaml');
      if (existsSync(packageJsonPath)) {
        return currentDir;
      }

      const parentDir = path.dirname(currentDir);
      // 如果到达根目录还没找到，使用当前文件所在目录
      if (parentDir === currentDir) {
        return import.meta.dirname;
      }

      currentDir = parentDir;
    }
  }

  /**
   * 格式化日志内容
   * @param level 日志级别
   * @param message 日志消息
   * @param meta 附加元数据
   * @returns 格式化的日志字符串
   */
  private formatLog(level: LogLevel, message: string, meta?: MetaData): string {
    const time = new Date().toISOString();
    let logStr = `[${time}] [${level.toUpperCase()}] ${message}`;

    // 如果有元数据，添加到日志中
    if (meta) {
      logStr += ` | ${JSON.stringify(meta)}`;
    }

    return `${logStr}\n`;
  }

  /**
   * 获取当前日志文件名（按日期）
   * @returns 日志文件名
   */
  private getLogFileName(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}.log`;
  }

  /**
   * 写入日志到文件
   * @param level 日志级别
   * @param message 日志消息
   * @param meta 附加元数据
   */
  private async log(
    level: LogLevel,
    message: string,
    meta?: MetaData,
  ): Promise<void> {
    // 检查日志级别
    if (!this.shouldLog(level)) return;

    // 格式化日志
    const logContent = this.formatLog(level, message, meta);

    // 获取日志文件路径
    const logFile = path.join(this.logDir, this.getLogFileName());

    try {
      // 追加写入日志
      await fs.appendFile(logFile, logContent);

      // 同时输出到控制台
      // console.log(logContent.trim())
    } catch (error) {
      console.error('写入日志失败:', error);
    }
  }

  /**
   * 检查日志级别是否需要记录
   * @param level 日志级别
   * @returns 是否需要记录
   */
  private shouldLog(level: LogLevel): boolean {
    const currentLevelIndex = this.levels.indexOf(this.level);
    const targetLevelIndex = this.levels.indexOf(level);
    return targetLevelIndex >= currentLevelIndex;
  }
}

// 导出默认实例
export default new Logger();
