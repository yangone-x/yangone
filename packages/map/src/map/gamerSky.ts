import type { MapData } from './type';

/**
 * 获取图标图片地址列表
 */
export function getIconUrls(mapInfo: any): [string, string][] {
  let index = 1;
  const output: [string, string][] = mapInfo.landmarkCatalogGroups.flatMap(
    (group: any) =>
      group.landmarkCatalogs.map(
        (catalog: any) =>
          [catalog.iconUrl, `${index++}.png`] as [string, string],
      ),
  );
  return output;
}

/**
 * 处理地图数据并保存到文件
 */
export async function genMapData(options: any) {
  const defaultOptions = {
    iconUrlTemplate: '{value}',
  };

  const mergeOptions = { ...defaultOptions, ...options };

  // 读取原始数据
  const mapInfo = mergeOptions.mapInfo;

  const regions = (mapInfo.gameMapAreas || []).map((item: any, index: number) => {
    return {
      id: index + 1,
      title: item.name,
      visibleZoom: item.visibleMapZoom,
      centerX: item.x,
      centerY: item.y,
    };
  });
  const categoryMap: Record<number, any> = {};
  let categoryIdCounter = 1;

  const groups = mapInfo.landmarkCatalogGroups.map(
    (item: any, index: number) => {
      const groupId = index + 1;
      return {
        id: groupId,
        title: item.groupName,
        categories: item.landmarkCatalogs.map((cate: any) => {
          const res = {
            id: categoryIdCounter,
            groupId,
            title: cate.name,
            icon: mergeOptions.iconUrlTemplate.replace(
              '{value}',
              categoryIdCounter,
            ),
            locationsCount: cate.landmarksCount,
          };
          categoryMap[cate.id] = res;
          categoryIdCounter++;
          return res;
        }),
      };
    },
  );

  const locations = mapInfo.landmarks.map((item: any, index: number) => {
    const category = categoryMap[item.landmarkCatalogId];
    return {
      id: index + 1,
      title: item.name,
      icon: category.icon,
      longitude: item.x,
      latitude: item.y,
      categoryId: category.id,
      category,
    };
  });

  const mapData: MapData = {
    map: {
      id: mapInfo.id,
      title: mapInfo.name,
    },
    mapConfig: {
      tileSize: mapInfo.mapTileSize || 256,
      tileMinZoom: mapInfo.mapTileZoomMin,
      tileMaxZoom: mapInfo.mapTileZoomMax,
      tileUrlsRoot: '/maps/{z}/{x}/{y}.png',
      defaultLat: 0.7,
      defaultLng: -0.7,
      defaultZoom: mapInfo.mapDefaultZoom,
    },
    regions,
    groups,
    locations,
  };

  return {
    mapData,
  };
}
