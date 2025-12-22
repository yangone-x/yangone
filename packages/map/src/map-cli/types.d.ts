import type {
  CreateTilesOptions,
  ExcelToPointsOptions,
  MergeImagesOptions,
  PointsToExcelOptions,
} from '../map/types';

export interface GamerSkyOptions {
  /**
   * 当前地图项目根路径
   */
  basePath: string;
  /**
   * 生成瓦片
   */
  createTiles?: {
    /**
     * 是否启用
     * @default false
     */
    enabled?: boolean;
  } & CreateTilesOptions;
  /**
   * 地图数据文件路径
   * @default "/mapInfo.json"
   */
  dataFilePath?: string;
  /**
   * 下载配置
   */
  download?: DownloadOptions;
  /**
   * 地图图标
   */
  icons?: {
    /**
     * 是否启用
     * @default false
     */
    enabled?: boolean;
    /**
     * 图标文件保存路径
     * @default "/icons"
     */
    saveFilePath?: string;
  };
  /**
   * 地图图片
   */
  maps?: {
    /**
     * 是否启用
     * @default false
     */
    enabled?: boolean;
    /**
     * 最大x或y值
     * @default 8192
     */
    high?: number;
    /**
     * 最小x或y值
     * @default 8128
     */
    low?: number;
    /**
     * 图标文件保存路径
     * @default "/images"
     */
    saveFilePath?: string;
    /**
     * 地图图片地址
     * @example https://xxxxxx/@{low}_@{high}.jpg
     */
    url: string;
  };
  /**
   * 合并图片
   */
  mergeImages?: {
    /**
     * 是否启用
     * @default false
     */
    enabled?: boolean;
  } & MergeImagesOptions;
  /**
   * 点位信息
   */
  points?: {
    /**
     * 是否启用
     * @default false
     */
    enabled?: boolean;
    /**
     * 偏移
     * @default 1
     * @example 1[64*256=16384]；0.5[32*128=4096]
     */
    offset?: number;
    /**
     * 输出文件路径
     * @default "/points.js"
     */
    outputPath?: string;
  };
}

export interface MapgenieOptions {
  /**
   * 当前地图项目根路径
   */
  basePath: string;
  /**
   * 生成瓦片
   */
  createTiles?: {
    /**
     * 是否启用
     * @default false
     */
    enabled?: boolean;
  } & CreateTilesOptions;
  /**
   * 地图数据文件路径
   * @default "/mapInfo.json"
   */
  dataFilePath?: string;
  // 下载配置
  download?: DownloadOptions;
  /**
   * 点位信息转换
   */
  excelToPoints?: ExcelToPointsOptions;
  /**
   * 地图图片
   */
  maps?: {
    /**
     * 是否启用
     * @default false
     */
    enabled?: boolean;
    /**
     * 最大x或y值
     * @default 8192
     */
    high?: number;
    /**
     * 最小x或y值
     * @default 8128
     */
    low?: number;
    /**
     * 图标文件保存路径
     * @default "/images"
     */
    saveFilePath?: string;
    /**
     * 地图图片地址
     * @example https://xxxxxx/@{low}_@{high}.jpg
     */
    url: string;
  };
  /**
   * 合并图片
   */
  mergeImages?: {
    /**
     * 是否启用
     * @default false
     */
    enabled?: boolean;
  } & MergeImagesOptions;
  /**
   * 点位信息
   */
  points?: {
    /**
     * 是否启用
     * @default false
     */
    enabled?: boolean;
    /**
     * 偏移
     * @default 1
     * @example 1[64*256=16384]；0.5[32*128=4096]
     */
    offset?: number;
    /**
     * 输出文件路径
     * @default "/points.js"
     */
    outputPath?: string;
  };
  /**
   * 点位信息转换
   */
  pointsToExcel?: PointsToExcelOptions;
}

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
  /**
   * 超时
   * @default 30000
   */
  timeout?: number;
}
