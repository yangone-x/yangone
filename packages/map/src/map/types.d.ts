export type ImageUrl = string;
type ImageWithFilename = [url: string, filename: string];

export type ImageData = ImageUrl[] | ImageWithFilename[];

// 图片合并配置选项类型
export interface MergeImagesOptions {
  /**
   * 排列方向
   * @default "horizontal"
   */
  direction?: 'horizontal' | 'vertical';
  /**
   * 图片高度
   * @default 256
   */
  imageHeight?: number;
  /**
   * 图片文件夹路径
   * @default "/images"
   */
  imagesPath?: string;
  /**
   * 每行图片数量
   * @default 64
   */
  imagesPerRow?: number;
  /**
   * 图片宽度
   * @default 256
   */
  imageWidth?: number;
  /**
   * 输出文件路径
   * @default "/merged_image.jpg"
   */
  outputPath?: string;
}

// 瓦片地图生成配置选项类型
export interface CreateTilesOptions {
  /**
   *  图片文件路径
   * @default "/merged_image.jpg"
   */
  imagesPath?: string;
  /**
   * 输出文件夹路径
   * @default "/maps"
   */
  outputPath?: string;
  /**
   * 瓦片大小
   * @default 256
   */
  tileSize?: number;
}

/**
 * 点位信息转换
 */
export interface PointsToExcelOptions {
  /**
   * 是否启用
   * @default false
   */
  enabled?: boolean;
  /**
   * 输入点位文件
   * @default "/points.json"
   */
  inputPath?: string;
  /**
   * 输出excel文件路径
   * @default "/points.xlsx"
   */
  outputPath?: string;
  /**
   * 工作表名称
   * @default "Sheet1"
   */
  worksheetName?: string;
}

/**
 * 点位信息转换
 */
export interface ExcelToPointsOptions {
  /**
   * 是否启用
   * @default false
   */
  enabled?: boolean;
  /**
   * 输出点位excel文件路径
   * @default "/newPoints.excel"
   */
  inputExcelPath?: string;
  /**
   * 输入点位文件
   * @default "/points.json"
   */
  inputPath?: string;
  /**
   * 输出excel文件路径
   * @default "/newPoints.json"
   */
  outputPath?: string;
  /**
   * 工作表名称
   * @default "Sheet1"
   */
  worksheetName?: string;
}
