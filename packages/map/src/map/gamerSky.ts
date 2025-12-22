import fs from 'node:fs';

import Decimal from 'decimal.js';

interface LandmarkCatalog {
  iconUrl: string;
  id: number;
  name: string;
}

interface LandmarkCatalogGroup {
  groupName: string;
  landmarkCatalogs: LandmarkCatalog[];
}

interface MapInfo {
  map: {
    id: number;
    landmarkCatalogGroups: LandmarkCatalogGroup[];
  };
}

interface Landmark {
  id: number;
  landmarkCatalogId: number;
  name: string;
  x: number;
  y: number;
}

interface LandmarkListResponse {
  landmarks: Landmark[];
}

interface ProcessedPoint {
  id: number;
  title: string;
  x: number;
  y: number;
}

interface ProcessedCategoryItem {
  data: ProcessedPoint[];
  icon: string;
  id: number;
  num: number;
  title: string;
}

interface ProcessedCategoryGroup {
  data: ProcessedCategoryItem[];
  title: string;
}

/**
 * 获取图标图片地址列表
 */
export function getIconUrls(mapInfo: MapInfo): [string, string][] {
  const { landmarkCatalogGroups } = mapInfo.map;

  let index = 1;
  const output: [string, string][] = landmarkCatalogGroups.flatMap((group) =>
    group.landmarkCatalogs.map(
      (catalog) => [catalog.iconUrl, `${index++}.png`] as [string, string],
    ),
  );
  return output;
}

/**
 * 获取地标列表数据并保存到文件
 */
export async function getLandmarkList(mapInfo: MapInfo) {
  const { map } = mapInfo;

  // 提取所有地标分类ID
  const ids: number[] = [];
  if (map && map.landmarkCatalogGroups) {
    map.landmarkCatalogGroups.forEach((group) => {
      group.landmarkCatalogs.forEach((catalog) => {
        ids.push(catalog.id);
      });
    });
  }

  if (ids.length === 0) {
    throw new Error('未找到任何地标分类ID');
  }

  // 发送POST请求获取地标数据
  const url = 'https://mapapi.gamersky.com/landmark/getLandmarkList';
  const postData = {
    catalogIdsSelected: ids,
    gameMapId: map.id,
    isConditionNoneEnable: false,
    keyword: '',
    userId: 0,
    userLabelTypeName: '',
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(postData),
  });

  if (!res.ok) {
    throw new Error(`请求失败: HTTP ${res.status}`);
  }

  const data: LandmarkListResponse = (await res.json()) as LandmarkListResponse;

  return data;
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

  const landmarksData: LandmarkListResponse = await getLandmarkList(
    mergeOptions.mapInfo,
  );

  if (!landmarksData.landmarks) {
    throw new Error('地标数据为空');
  }

  // 处理分类数据
  let iconIndex = 1;
  const processedCategories: ProcessedCategoryGroup[] =
    categoryData.map.landmarkCatalogGroups.map((group) => ({
      title: group.groupName,
      data: group.landmarkCatalogs.map((catalog) => ({
        title: catalog.name,
        num: 0,
        icon: `https://img.ali213.com/lmao/tools/${mergeOptions.gameUrl}/icons/${iconIndex++}.png`,
        id: catalog.id,
        data: [] as ProcessedPoint[],
      })),
    }));

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
  landmarksData.landmarks.forEach((landmark) => {
    const categoryId = landmark.landmarkCatalogId;

    if (!landmarkMap[categoryId]) {
      landmarkMap[categoryId] = [];
    }

    // 高精度坐标转换
    const x = new Decimal(landmark.x)
      .plus(X_OFFSET)
      .times(X_COEFFICIENT)
      .toNumber();
    const y = new Decimal(landmark.y)
      .minus(Y_OFFSET)
      .times(Y_COEFFICIENT)
      .toNumber();

    landmarkMap[categoryId].push({
      id: idCounter++,
      title: landmark.name,
      x,
      y,
    });
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
  fs.writeFileSync(
    mergeOptions.outputPath,
    JSON.stringify(processedCategories, null, 2),
  );

  return {
    outputPath: mergeOptions.outputPath,
  };
}
