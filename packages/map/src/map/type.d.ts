interface Category {
  groupId: number;
  icon: string;
  id: number;
  locationsCount: number;
  title: string;
}

interface Group {
  categories: Category[];
  id: number;
  title: string;
}

interface Region {
  centerX: number;
  centerY: number;
  id: number;
  title: string;
  visibleZoom: string;
}

interface Location {
  category: Category;
  categoryId: number;
  fullTitle: string;
  icon: string;
  id: number;
  latitude: number;
  longitude: number;
  title: string;
}

export interface MapData {
  groups: Group[];
  locations: Location[];
  map: {
    id: number;
    title: string;
  };
  mapConfig: {
    defaultLat: number;
    defaultLng: number;
    defaultZoom: number;
    tileMaxZoom: number;
    tileMinZoom: number;
    tileSize: number;
    tileUrlsRoot: string;
  };
  regions: Region[];
}
