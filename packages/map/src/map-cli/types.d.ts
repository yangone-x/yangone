import type { FetchImagesOptions } from '../index';

import { mapgenie, MergeImagesOptions, SliceImageOptions } from '../index';

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
  } & SliceImageOptions;
  /**
   * 地图数据文件路径
   * @default "/mapInfo.json"
   */
  dataFilePath?: string;
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
    outputPath?: string;
  };
  /**
   * 地图图片
   */
  maps?: {
    /**
     * 下载文件后缀
     * @default "png"
     */
    downFileExt?: string;
    /**
     * 下载配置
     */
    download?: FetchImagesOptions;
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
    outputPath?: string;
    /**
     * 地图图片地址
     * @example https://xxxxxx/{x}_{y}.png
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
     */
    offset?: number;
    /**
     * 输出区域位置文件路径
     * @default "/points_area.json"
     */
    outputAreaPath?: string;
    /**
     * 输出文件路径
     * @default "/points.json"
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
  } & SliceImageOptions;
  /**
   * 地图数据文件路径
   * @default "/mapInfo.json"
   */
  dataFilePath?: string;
  // 下载配置
  download?: FetchImagesOptions;
  /**
   * 点位信息转换
   */
  excelToPoints?: mapgenie.ExcelToPointsOptions;
  /**
   * 地图图片
   */
  maps?: {
    /**
     * 下载文件后缀
     * @default "png"
     */
    downFileExt?: string;
    /**
     * 下载配置
     */
    download?: DownloadOptions;
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
    outputPath?: string;
    /**
     * 地图图片地址
     * @example https://xxxxxx/{x}_{y}.png
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
     * @default "/points.json"
     */
    outputPath?: string;
  };
  /**
   * 点位信息转换
   */
  pointsToExcel?: mapgenie.PointsToExcelOptions;
}
