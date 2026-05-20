export type ImageUrl = string;
export type ImageWithFilename = [url: string, filename: string];

export type ImageData = ImageUrl[] | ImageWithFilename[];

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
   * 输入点位excel文件路径
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
