import type { MapData } from './type';

import ExcelJS from 'exceljs';

import { readJSON, writeJSON } from '../fs';

/**
 * 处理地图数据并保存到文件
 */
export async function genMapData(options: any) {
  const defaultOptions = {
    outputPath: './mapData.json',
  };

  const mergeOptions = { ...defaultOptions, ...options };

  const mapInfo = mergeOptions.mapInfo;

  // 读取原始数据
  const regions = mapInfo.regions.map((item: any, index: number) => {
    return {
      id: index,
      title: item.title,
      visibleZoom: '8,9,10,11,12,13',
      centerX: Number.parseFloat(item.center_x),
      centerY: Number.parseFloat(item.center_y),
    };
  });
  const categoryMap: Record<number, any> = {};
  let categoryIdCounter = 0;

  const groups = mapInfo.groups.map((item: any, index: number) => {
    return {
      id: index,
      title: item.title,
      color: item.color,
      categories: item.categories.map((cate: any) => {
        const res = {
          id: categoryIdCounter++,
          groupId: index,
          title: cate.title,
          icon: cate.icon,
          locationsCount: cate.locations_count,
        };
        categoryMap[cate.id] = res;
        return res;
      }),
    };
  });

  const locations = mapInfo.locations.map((item: any, index: number) => {
    const category = categoryMap[item.category_id];
    return {
      id: index,
      title: item.title,
      icon: category.icon,
      longitude: item.longitude,
      latitude: item.latitude,
      categoryId: category.id,
      category,
    };
  });

  const mapData: MapData = {
    map: {
      id: mapInfo.map.id,
      title: mapInfo.map.title,
    },
    mapConfig: {
      tileSize: 256,
      tileMinZoom: mapInfo.mapConfig.tile_sets[0].min_zoom,
      tileMaxZoom: mapInfo.mapConfig.tile_sets[0].max_zoom,
      tileUrlsRoot: '/maps/{z}/{x}/{y}.png',
      defaultLat: mapInfo.mapConfig.start_lat,
      defaultLng: mapInfo.mapConfig.start_lng,
      defaultZoom: mapInfo.mapConfig.initial_zoom,
    },
    regions,
    groups,
    locations,
  };

  // 保存结果
  await writeJSON(mergeOptions.outputPath, mapData);

  return {
    outputPath: mergeOptions.outputPath,
  };
}

/**
 * 点位信息转换
 */
export interface MapDataToExcelOptions {
  /**
   * 是否启用
   * @default false
   */
  enabled?: boolean;
  /**
   * 输入点位文件
   * @default "./mapData.json"
   */
  inputPath?: string;
  /**
   * 输出excel文件路径
   * @default "./mapData.xlsx"
   */
  outputPath?: string;
  /**
   * 工作表名称
   * @default "Sheet1"
   */
  worksheetName?: string;
}

/**
 * 生成Excel文件
 */
export async function writeMapDataExcel(options: MapDataToExcelOptions) {
  const defaultOptions = {
    inputPath: './mapData.json',
    outputPath: './mapData.xlsx',
    worksheetName: 'Sheet1',
  };

  const mergeOptions = { ...defaultOptions, ...options };

  const pointData = await readJSON<any[]>(
    mergeOptions.inputPath,
  );

  // 创建工作簿和工作表
  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.readFile(mergeOptions.outputPath);
  } catch {
    // 如果文件不存在，继续使用空工作簿
  }

  let worksheet = workbook.getWorksheet(mergeOptions.worksheetName);
  if (worksheet) {
    workbook.removeWorksheet(worksheet.id);
  }
  worksheet = workbook.addWorksheet(mergeOptions.worksheetName, {
    properties: { defaultRowHeight: 20 },
    views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }], // 冻结首行首列
  });

  // 定义列标题和宽度（先不设置对齐）
  const columns: Partial<ExcelJS.Column>[] = [
    { header: '分组id', key: 'groupId', width: 10 },
    { header: '分组名称en', key: 'groupNameEn', width: 15 },
    { header: '分组名称zh', key: 'groupNameZh', width: 15 },
    { header: '分类id', key: 'categoryId', width: 10 },
    { header: '分类名称en', key: 'categoryNameEn', width: 20 },
    { header: '分类名称zh', key: 'categoryNameZh', width: 20 },
    { header: '点位ID', key: 'pointId', width: 10 },
    { header: '点位名称en', key: 'pointNameEn', width: 30 },
    { header: '点位名称zh', key: 'pointNameZh', width: 30 },
  ];
  worksheet.columns = columns;

  const centerAlignment: Partial<ExcelJS.Alignment> = {
    vertical: 'middle',
    horizontal: 'center',
  };

  // 设置标题行样式
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 12 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'E6E6FA' },
  };
  headerRow.eachCell({ includeEmpty: false }, (cell) => {
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  pointData.forEach((group) => {
    group.data.forEach((category: any) => {
      category.data.forEach((point: any) => {
        const newRow = worksheet.addRow({
          groupId: group.id,
          groupNameEn: group.title,
          groupNameZh: '',
          categoryId: category.id,
          categoryNameEn: category.title,
          categoryNameZh: '',
          pointId: point.id,
          pointNameEn: point.title,
          pointNameZh: '',
        });

        // 遍历当前行所有单元格，设置样式
        newRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          // ID列（A、D、G列）：水平+垂直居中
          cell.alignment = [1, 4, 7].includes(colNumber)
            ? centerAlignment
            : { vertical: 'middle' };
        });
      });
    });
  });

  // 保存文件
  await workbook.xlsx.writeFile(mergeOptions.outputPath);

  return {
    outputPath: mergeOptions.outputPath,
  };
}

/**
 * 点位信息转换
 */
export interface ExcelToMapDataOptions {
  /**
   * 是否启用
   * @default false
   */
  enabled?: boolean;
  /**
   * 输入点位excel文件路径
   * @default "./newMapData.xlsx"
   */
  inputExcelPath?: string;
  /**
   * 输入点位文件
   * @default "./mapData.json"
   */
  inputPath?: string;
  /**
   * 输出excel文件路径
   * @default "./newMapData.json"
   */
  outputPath?: string;
  /**
   * 工作表名称
   * @default "Sheet1"
   */
  worksheetName?: string;
}

/**
 * 处理Excel文件
 */
export async function readMapDataExcel(options: ExcelToMapDataOptions) {
  const defaultOptions = {
    inputPath: './points.json',
    inputExcelPath: './newPoints.xlsx',
    outputPath: './newPoints.json',
    worksheetName: 'Sheet1',
  };
  const mergeOptions = { ...defaultOptions, ...options };

  const pointData: any[] = await readJSON<
    any[]
  >(mergeOptions.inputPath);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(mergeOptions.inputExcelPath);

  const worksheet = workbook.getWorksheet(mergeOptions.worksheetName);
  if (!worksheet) {
    throw new Error(`指定【${mergeOptions.worksheetName}】工作表不存在`);
  }

  // 定义列配置（与Excel列对应）
  const columns: Partial<ExcelJS.Column>[] = [
    { header: '分组id', key: 'groupId', width: 10 },
    { header: '分组名称en', key: 'groupNameEn', width: 15 },
    { header: '分组名称zh', key: 'groupNameZh', width: 15 },
    { header: '分类id', key: 'categoryId', width: 10 },
    { header: '分类名称en', key: 'categoryNameEn', width: 20 },
    { header: '分类名称zh', key: 'categoryNameZh', width: 20 },
    { header: '点位ID', key: 'pointId', width: 10 },
    { header: '点位名称en', key: 'pointNameEn', width: 30 },
    { header: '点位名称zh', key: 'pointNameZh', width: 30 },
  ];

  const groupMap: any = {};
  const categoryMap: any = {};
  const pointMap: any = {};

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // 跳过表头行

    // 构建当前行的数据对象（按columns的key映射值）
    const rowData: any = {};
    columns.forEach((col, index) => {
      // Excel列索引从1开始，index+1对应列位置
      const cell = row.getCell(index + 1);
      const key = col.key;
      if (key) {
        rowData[key] = cell.value || ''; // 空值处理为空字符串
      }
    });

    // 构建分组映射
    const groupId = Number.parseInt(rowData?.groupId);
    if (groupId) {
      groupMap[groupId] = rowData.groupNameZh;
    }

    // 构建分类映射
    const categoryId = Number.parseInt(rowData?.categoryId);
    if (categoryId) {
      categoryMap[categoryId] = rowData.categoryNameZh;
    }

    // 构建点位映射
    const pointId = Number.parseInt(rowData?.pointId);
    if (pointId) {
      pointMap[pointId] = rowData.pointNameZh;
    }
  });

  pointData.forEach((group) => {
    group.title = groupMap[group.id];
    group.data.forEach((category: any) => {
      category.title = categoryMap[category.id];
      category.data.forEach((point: any) => {
        point.title = pointMap[point.id];
      });
    });
  });

  await writeJSON(mergeOptions.outputPath, pointData);

  return {
    outputPath: mergeOptions.outputPath,
    points: pointData,
  };
}
