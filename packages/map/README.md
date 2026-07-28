# @yangone/climb-map

本模块提供了一套高效的图片处理工具，主要包含以下三个核心功能：

1. **批量下载图片** (fetchImages)：支持并发下载、自动重命名及超时控制。
2. **图片切片/瓦片化** (sliceImage)：将大图切割成 XYZ 标准的地图瓦片序列。
3. **图片合并/拼接** (mergeImages)：将分散的瓦片或图片网格重新合并为一张大图。

## 安装依赖

```bash
pnpm install @yangone/climb-map
```

## API 参考

### 1. 批量下载图片 (fetchImages)

从远程 URL 批量下载图片到本地文件夹。

#### 导入

```typescript
import { fetchImages } from '@yangone/climb-map';
```

#### 用法示例

```typescript
import { fetchImages } from '@yangone/climb-map';

async function main() {
  const urls = [
    'https://example.com/image1.png',
    ['https://example.com/image2.jpg', 'custom_name.jpg'], // 指定文件名
  ];

  const result = await fetchImages({
    images: urls,
    outputPath: './output',
    concurrency: 5,
    timeout: 10000,
    onTick: ({ url, filename }) => {
      console.log(`Downloaded: ${filename}`);
    },
    onTickError: ({ url, error }) => {
      console.error(`Failed to download ${url}: ${error}`);
    },
  });

  console.log(`Success: ${result.successCount}, Failed: ${result.failCount}`);
}
```

#### 参数说明

| 参数 | 类型 | 默认值 | 描述 |
| :-- | :-- | :-- | :-- |
| `options.images` | `string[]` \| `[string, string][]` | - | 图片 URL 数组，或`[URL, 文件名]` 元组数组 |
| `options.outputPath` | `string` | `/images` | 保存文件夹路径 |
| `options.concurrency` | `number` | `10` | 最大并发下载数 |
| `options.timeout` | `number` | `30000` | 单个请求超时时间 (ms) |
| `options.onTick` | `function` | - | 每个文件处理完成后的回调 |
| `options.onTickError` | `function` | - | 每个文件处理失败后的回调 |

---

### 2. 图片切片/瓦片化 (sliceImage)

将一张大图切割成多个小瓦片（Tiles），通常用于地图引擎（如 Leaflet, OpenLayers, Mapbox）。输出结构遵循 `z/x/y.ext` 格式。

#### 导入

```typescript
import { sliceImage } from '@yangone/climb-map';
```

#### 用法示例

```typescript
import { sliceImage } from '@yangone/climb-map';

async function main() {
  const result = await sliceImage({
    imagePath: './source/big-map.png',
    outputPath: './tiles/output',
    tileSize: 256,
    minZoom: 6,
    tileExt: 'png',
    quality: 80,
    concurrency: 4,
    onTick: ({ zoom }) => {
      console.log(`Processing zoom level: ${zoom}`);
    },
  });

  console.log(`Generated ${result.tilesGenerated} tiles.`);
}
```

#### 参数说明

| 参数 | 类型 | 默认值 | 描述 |
| :-- | :-- | :-- | :-- |
| `options.imagePath` | `string` | **(必填)** | 原始大图片的路径 |
| `options.outputPath` | `string` | `/maps` | 瓦片输出根目录 |
| `options.tileSize` | `number` | `256` | 瓦片尺寸 (px) |
| `options.minZoom` | `number` | `8` | 最小缩放级别 (Z轴) |
| `options.tileExt` | `string` | `png` | 输出瓦片格式 (`png`, `jpg`, `webp`) |
| `options.quality` | `number` | `80` | 输出质量 (0-100)，PNG 忽略此项 |
| `options.concurrency` | `number` | `CPU核数` | 并发处理任务数 |
| `options.sharpPixelLimit` | `number` | `1e9` | Sharp 库像素限制防止内存溢出 |
| `options.onTick` | `function` | - | 每完成一个 Zoom 层级的回调 |

**输出目录结构示例：**

```text
output/
├── 8/
│   └── 127/
│       └── 127.png
├── 9/
│   ├── 254/
│   │   ├── 254.png
│   │   └── 255.png
│   └── 255/
│       ├── 254.png
│       └── 255.png
...
```

---

### 3. 图片合并/拼接 (mergeImages)

将指定目录下的多张小图按照网格布局合并成一张大图。支持行优先或列优先排列。

#### 导入

```typescript
import { mergeImages } from '@yangone/climb-map';
```

#### 用法示例

```typescript
import { mergeImages } from '@yangone/climb-map';

async function main() {
  const result = await mergeImages({
    imagesPath: './tiles/6', // 包含 {x}_{y}.png 文件的目录
    outputPath: './merged/result.png',
    cols: 64,
    rows: 64,
    imageWidth: 256,
    imageHeight: 256,
    imagePattern: '{x}_{y}.png', // 文件名匹配规则
    direction: 'horizontal', // 行优先填充
    outputFormat: 'png',
    onTick: ({ process }) => {
      console.log(`Merging row/col: ${process}`);
    },
  });

  console.log(`Merged image saved to: ${result.outputPath}`);
  console.log(`Dimensions: ${result.totalWidth}x${result.totalHeight}`);
}
```

#### 参数说明

| 参数 | 类型 | 默认值 | 描述 |
| :-- | :-- | :-- | :-- |
| `options.imagesPath` | `string` | **(必填)** | 包含源图片的文件夹路径 |
| `options.outputPath` | `string` | `./merged_image.png` | 输出文件路径 |
| `options.cols` | `number` | `64` | 网格列数 |
| `options.rows` | `number` | `64` | 网格行数 |
| `options.imageWidth` | `number` | `256` | 单张图片宽度 |
| `options.imageHeight` | `number` | `256` | 单张图片高度 |
| `options.imagePattern` | `string` | `{x}_{y}.png` | 文件名模板，支持`{x}` 和 `{y}` 占位符 |
| `options.direction` | `string` | [horizontal] (行优先), [vertical] (列优先) |  |
| `options.outputFormat` | `string` | `png` | 输出格式:`png`, `jpg`, `webp` |
| `options.quality` | `number` | `80` | 输出质量 (针对 jpg/webp) |
| `options.onTick` | `function` | - | 进度回调 |

## 注意事项

1. **内存管理**: [mergeImages] 和 [sliceImage] 使用 `sharp` 进行图像处理。对于超大图片，请适当调整 [sharpPixelLimit] 并确保服务器有足够的内存。
2. **并发控制**: [fetchImages] 和 [sliceImage] 均支持并发配置。建议根据网络状况或 CPU 核心数调整 [concurrency] 以获得最佳性能。
3. **文件格式**:
   - [sliceImage] 支持 PNG, JPEG, WebP。
   - [mergeImages] 支持输出为 PNG, JPEG, WebP。
4. **错误处理**: [fetchImages] 不会因单个文件失败而中断整个流程，失败信息会通过 [onTickError] 回调或返回结果中的 [failFiles] 提供。
