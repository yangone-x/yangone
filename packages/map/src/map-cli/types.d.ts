import type { FetchImagesOptions } from '../index';

import { mapgenie, MergeImagesOptions, SliceImageOptions } from '../index';

interface CommonOptions {
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
   * @default "./mapInfo.json"
   */
  dataFilePath?: string;
  /**
   * 点位信息
   */
  mapData?: {
    /**
     * 是否启用
     * @default false
     */
    enabled?: boolean;
    /**
     * 图标模板
     * @default '/{index}.png'
     */
    iconUrlTemplate?: string;
    /**
     * 输出文件路径
     * @default "./mapData.json"
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
    download?: Omit<FetchImagesOptions, 'images'>;
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
     * @default "./images"
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
}

export interface GamerSkyOptions extends CommonOptions {
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
     * @default "./icons"
     */
    outputPath?: string;
  };
}

export interface MapgenieOptions extends CommonOptions {
  /**
   * 点位信息转换
   */
  excelToPoints?: mapgenie.ExcelToMapDataOptions;
  /**
   * 点位信息转换
   */
  pointsToExcel?: mapgenie.MapDataToExcelOptions;
}
