import type { ExcelToPointsOptions, PointsToExcelOptions } from './types';

import Decimal from 'decimal.js';
import ExcelJS from 'exceljs';

import { readJSON, writeJSON } from '../fs';

// 类别
interface Category {
  display_type: string;
  group_id: number;
  icon: string;
  id: number;
  title: string;
}
// 组别
interface Group {
  categories: Category[];
  color: string;
  game_id: number;
  id: number;
  title: string;
}
interface Location {
  category_id: number;
  description: string;
  id: number;
  latitude: string;
  longitude: string;
  map_id: number;
  region_id: number;
  title: string;
}

interface MapInfo {
  groups: Group[];
  locations: Location[];
}

// 类型定义：处理后的地标点数据
interface ProcessedPoint {
  id: number;
  title: string;
  x: number;
  y: number;
}

interface ProcessedCategoryItem {
  data: ProcessedPoint[];
  display_type: string;
  icon: string;
  id: number;
  num: number;
  title: string;
}

interface ProcessedCategoryGroup {
  color: string;
  data: ProcessedCategoryItem[];
  id: number;
  title: string;
}

/**
 * 处理地标数据并保存到文件
 */
export async function genPoints(options: any) {
  const defaultOptions = {
    gameUrl: '',
    outputPath: '/points.json',
    offset: 1,
  };

  const mergeOptions = { ...defaultOptions, ...options };

  // 读取原始数据
  const categoryData: MapInfo = mergeOptions.mapInfo;

  if (!categoryData.locations) {
    throw new Error('地标数据为空');
  }

  // 处理分类数据
  let iconIndex = 1;
  const processedCategories: ProcessedCategoryGroup[] = categoryData.groups.map(
    (group, index) => {
      return {
        id: index + 1,
        title: group.title,
        color: group.color,
        data: group.categories.map((catalog) => {
          return {
            title: catalog.title,
            num: 0,
            icon: `https://img.ali213.com/lmao/tools/${mergeOptions.gameUrl}/icons/${iconIndex++}.png`,
            iconFont: catalog.icon,
            id: catalog.id,
            data: [] as ProcessedPoint[],
            display_type: catalog.display_type,
          };
        }),
      };
    },
  );

  // 构建地标映射表
  const landmarkMap: Record<number, ProcessedPoint[]> = {};
  let idCounter = 1;

  // 转换系数常量
  const X_COEFFICIENT = new Decimal(11_659.388).mul(
    new Decimal(mergeOptions.offset),
  );
  const Y_COEFFICIENT = new Decimal(-11_693.33).mul(
    new Decimal(mergeOptions.offset),
  );
  const X_OFFSET = new Decimal(1.405_672);
  const Y_OFFSET = new Decimal(1.404);

  // 处理每个地标点
  categoryData.locations.forEach((landmark) => {
    const categoryId = landmark.category_id;

    if (!landmarkMap[categoryId]) {
      landmarkMap[categoryId] = [];
    }

    // 高精度坐标转换
    const x = new Decimal(landmark.longitude)
      .plus(X_OFFSET)
      .times(X_COEFFICIENT)
      .toNumber();
    const y = new Decimal(landmark.latitude)
      .minus(Y_OFFSET)
      .times(Y_COEFFICIENT)
      .toNumber();

    landmarkMap[categoryId].push({
      id: idCounter,
      title: landmark.title,
      x,
      y,
    });

    idCounter++;
  });

  // 合并数据
  processedCategories.forEach((category) => {
    category.data.forEach((item) => {
      const points = landmarkMap[item.id];
      if (points) {
        item.data = points;
        item.num = points.length;
      } else {
        item.data = [];
        item.num = 0;
      }
    });
  });

  // 保存结果
  await writeJSON(mergeOptions.outputPath, processedCategories);

  return {
    outputPath: mergeOptions.outputPath,
    points: processedCategories,
  };
}

/**
 * 生成Excel文件
 */
export async function writePointExcel(options: PointsToExcelOptions) {
  const defaultOptions = {
    inputPath: '/points.json',
    outputPath: '/newPoints.xlsx',
    worksheetName: 'Sheet1',
  };

  const mergeOptions = { ...defaultOptions, ...options };

  const pointData = await readJSON<ProcessedCategoryGroup[]>(
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
    group.data.forEach((category) => {
      category.data.forEach((point) => {
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
 * 处理Excel文件
 */
export async function readPointExcel(options: ExcelToPointsOptions) {
  const defaultOptions = {
    inputPath: '/points.json',
    inputExcelPath: '/newPoints.xlsx',
    outputPath: '/newPoints.json',
    worksheetName: 'Sheet1',
  };
  const mergeOptions = { ...defaultOptions, ...options };

  const pointData: ProcessedCategoryGroup[] = await readJSON<
    ProcessedCategoryGroup[]
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
    group.data.forEach((category) => {
      category.title = categoryMap[category.id];
      category.data.forEach((point) => {
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
