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

从远程 URL 批量下载图片到本地文件夹。`fetchImages` 同步返回一个**控制器对象**，包含 `start` / `stop` 功能，方便外部控制下载的开始与中止。

#### 导入

```typescript
import { fetchImages } from '@yangone/climb-map';
```

#### 用法示例

```typescript
import { fetchImages } from '@yangone/climb-map';

const urls = [
  'https://example.com/image1.png',
  ['https://example.com/image2.jpg', 'custom_name.jpg'], // 指定文件名
];

// 1. 创建任务（同步返回控制器，此时尚未开始下载）
const task = fetchImages({
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

// 2. 开始下载（不阻塞）
task.start();

// 3. 任意时刻可停止：中断进行中的请求，跳过未开始的任务
//    Promise 不会 reject，而是以已完成部分正常 resolve
//    result.stopped === true，未完成的任务记入 failFiles（可回喂 images 重试）
setTimeout(() => task.stop(), 3000);

// 4. 等待结束并拿到结果
const result = await task.promise;
console.log(`Success: ${result.successCount}, Failed: ${result.failCount}, Stopped: ${result.stopped}`);
```

一次性下载（无需中途停止）可直接：

```typescript
const result = await fetchImages({ images: urls, outputPath: './output' }).start();
```

#### 控制器属性/方法 (FetchImagesController)

| 成员                             | 类型                                  | 描述                                                                                                                           |
| :------------------------------- | :------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------- |
| `start()`                      | `() => Promise<FetchImagesResult>`  | 开始下载（同步返回，不阻塞）。运行中重复调用返回同一个 Promise；上一轮结束后可再次调用开启新一轮（状态自动复位）               |
| `stop()`                       | `() => void`                        | 停止下载：中断进行中的请求并跳过未开始的任务，Promise 以已完成部分 resolve（`stopped: true`）。未 start 或已结束时调用无效果 |
| `promise`                      | `Promise<FetchImagesResult> \| null` | 本次（或最近一次）运行的 Promise；未 start 时为 `null`                                                                       |
| `result`                       | `FetchImagesResult \| null`          | 最近一次运行的结果；未运行完时为 `null`                                                                                      |
| `getResult()`                  | `() => FetchImagesResult`           | 获取结果，未完成时抛错                                                                                                         |
| `successCount` / `failCount` | `number`                            | 实时成功/失败数量                                                                                                              |
| `isRunning`                    | `boolean`                           | 是否正在下载                                                                                                                   |
| `isStopped`                    | `boolean`                           | 是否已被停止                                                                                                                   |

#### 返回结果 (FetchImagesResult)

| 字段             | 类型                   | 描述                                                   |
| :--------------- | :--------------------- | :----------------------------------------------------- |
| `successCount` | `number`             | 成功数量                                               |
| `failCount`    | `number`             | 失败数量（含被 stop 跳过的任务）                       |
| `failFiles`    | `[string, string][]` | 失败文件 `[url, 文件名]`，可直接回喂 `images` 重试 |
| `stopped`      | `boolean`            | 是否被中途停止                                         |

#### 参数说明

| 参数                    | 类型                                   | 默认值      | 描述                                                              |
| :---------------------- | :------------------------------------- | :---------- | :---------------------------------------------------------------- |
| `options.images`      | `string[]` \| `[string, string][]` | -           | 图片 URL 数组，或`[URL, 文件名]` 元组数组                       |
| `options.outputPath`  | `string`                             | `/images` | 保存文件夹路径                                                    |
| `options.concurrency` | `number`                             | `10`      | 最大并发下载数                                                    |
| `options.timeout`     | `number`                             | `30000`   | 单个请求超时时间 (ms)                                             |
| `options.onTick`      | `function`                           | -           | 每个文件处理完成后的回调（失败/跳过项也会触发，不要当成功计数用） |
| `options.onTickError` | `function`                           | -           | 每个文件处理失败后的回调                                          |

---

### 2. 图片切片/瓦片化 (sliceImage)

将一张大图切割成多个小瓦片（Tiles），通常用于地图引擎（如 Leaflet, OpenLayers, Mapbox）。输出结构遵循 `z/x/y.ext` 格式。与 `fetchImages` 一样，`sliceImage` 同步返回一个**控制器对象**，包含 `start` / `stop` 功能。

#### 导入

```typescript
import { sliceImage } from '@yangone/climb-map';
```

#### 用法示例

```typescript
import { sliceImage } from '@yangone/climb-map';

// 1. 创建任务（同步返回控制器，此时尚未开始切片）
const task = sliceImage({
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

// 2. 开始切片（不阻塞）；任意时刻可 task.stop() 中止
task.start();
// task.stop(); // 跳过后续层级/瓦片，Promise 以已完成部分 resolve（stopped: true，已生成瓦片保留）

// 3. 等待结束并拿到结果
const result = await task.promise;
console.log(`Generated ${result.tilesGenerated} tiles.`);
```

一次性切片（无需中途停止）可直接：

```typescript
const result = await sliceImage({ imagePath: './source/big-map.png' }).start();
```

#### 控制器属性/方法 (SliceImageController)

| 成员               | 类型                                 | 描述                                                                                                                                       |
| :----------------- | :----------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------- |
| `start()`        | `() => Promise<SliceImageResult>`  | 开始切片（同步返回，不阻塞）。运行中重复调用返回同一个 Promise；上一轮结束后可再次调用开启新一轮（状态自动复位）                           |
| `stop()`         | `() => void`                       | 停止切片：跳过后续层级和未开始的瓦片任务，Promise 以已完成部分 resolve（`stopped: true`，已生成瓦片保留）。未 start 或已结束时调用无效果 |
| `promise`        | `Promise<SliceImageResult> \| null` | 本次（或最近一次）运行的 Promise；未 start 时为 `null`                                                                                   |
| `result`         | `SliceImageResult \| null`          | 最近一次运行的结果；未运行完时为 `null`                                                                                                  |
| `getResult()`    | `() => SliceImageResult`           | 获取结果，未完成时抛错                                                                                                                     |
| `tilesGenerated` | `number`                           | 已生成瓦片数量（实时）                                                                                                                     |
| `isRunning`      | `boolean`                          | 是否正在切片                                                                                                                               |
| `isStopped`      | `boolean`                          | 是否已被停止                                                                                                                               |

#### 返回结果 (SliceImageResult)

| 字段                      | 类型        | 描述                       |
| :------------------------ | :---------- | :------------------------- |
| `outputPath`            | `string`  | 瓦片输出根目录（绝对路径） |
| `tilesGenerated`        | `number`  | 已生成瓦片数量             |
| `originalSize`          | `string`  | 原图尺寸（`宽x高`）      |
| `minZoom` / `maxZoom` | `number`  | 实际切片层级范围           |
| `stopped`               | `boolean` | 是否被中途停止             |

#### 参数说明

| 参数                        | 类型         | 默认值           | 描述                                      |
| :-------------------------- | :----------- | :--------------- | :---------------------------------------- |
| `options.imagePath`       | `string`   | **(必填)** | 原始大图片的路径                          |
| `options.outputPath`      | `string`   | `/maps`        | 瓦片输出根目录                            |
| `options.tileSize`        | `number`   | `256`          | 瓦片尺寸 (px)                             |
| `options.minZoom`         | `number`   | `8`            | 最小缩放级别 (Z轴)                        |
| `options.tileExt`         | `string`   | `png`          | 输出瓦片格式 (`png`, `jpg`, `webp`) |
| `options.quality`         | `number`   | `80`           | 输出质量 (0-100)，PNG 忽略此项            |
| `options.concurrency`     | `number`   | `CPU核数`      | 并发处理任务数                            |
| `options.sharpPixelLimit` | `number`   | `1e9`          | Sharp 库像素限制防止内存溢出              |
| `options.onTick`          | `function` | -                | 每完成一个 Zoom 层级的回调                |

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

将指定目录下的多张小图按照网格布局合并成一张大图。支持行优先或列优先排列。与 `fetchImages` 一样，`mergeImages` 同步返回一个**控制器对象**，包含 `start` / `stop` 功能。

#### 导入

```typescript
import { mergeImages } from '@yangone/climb-map';
```

#### 用法示例

```typescript
import { mergeImages } from '@yangone/climb-map';

// 1. 创建任务（同步返回控制器，此时尚未开始合成）
const task = mergeImages({
  imagesPath: './tiles/6', // 包含 {x}_{y}.png 文件的目录
  outputPath: './merged/result.png',
  cols: 64,
  rows: 64,
  imageWidth: 256,
  imageHeight: 256,
  imagePattern: '{x}_{y}.png', // 文件名匹配规则
  direction: 'horizontal', // 行优先填充
  onTick: ({ process }) => {
    console.log(`Merging row/col: ${process}`);
  },
});

// 2. 开始合成（不阻塞）；任意时刻可 task.stop() 中止
task.start();
// task.stop(); // 跳过未开始的条带，已合成部分仍写入输出文件（其余区域为透明）

// 3. 等待结束并拿到结果
const result = await task.promise;
console.log(`Merged image saved to: ${result.outputPath}`);
console.log(`Dimensions: ${result.totalWidth}x${result.totalHeight}, Stopped: ${result.stopped}`);
```

一次性合成（无需中途停止）可直接：

```typescript
const result = await mergeImages({ imagesPath: './tiles/6' }).start();
```

#### 控制器属性/方法 (MergeImagesController)

| 成员                      | 类型                                  | 描述                                                                                                                                                                 |
| :------------------------ | :------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `start()`               | `() => Promise<MergeImagesResult>`  | 开始合成（同步返回，不阻塞）。运行中重复调用返回同一个 Promise；上一轮结束后可再次调用开启新一轮（状态自动复位）                                                     |
| `stop()`                | `() => void`                        | 停止合成：跳过未开始的条带任务，已合成部分仍会编码写入输出文件（未合成区域为透明），Promise 以已完成部分 resolve（`stopped: true`）。未 start 或已结束时调用无效果 |
| `promise`               | `Promise<MergeImagesResult> \| null` | 本次（或最近一次）运行的 Promise；未 start 时为 `null`                                                                                                             |
| `result`                | `MergeImagesResult \| null`          | 最近一次运行的结果；未运行完时为 `null`                                                                                                                            |
| `getResult()`           | `() => MergeImagesResult`           | 获取结果，未完成时抛错                                                                                                                                               |
| `processed` / `total` | `number`                            | 已处理条带数（实时）/ 条带总数（horizontal 为行数，vertical 为列数）                                                                                                 |
| `isRunning`             | `boolean`                           | 是否正在合成                                                                                                                                                         |
| `isStopped`             | `boolean`                           | 是否已被停止                                                                                                                                                         |

#### 返回结果 (MergeImagesResult)

| 字段                             | 类型        | 描述                                               |
| :------------------------------- | :---------- | :------------------------------------------------- |
| `outputPath`                   | `string`  | 输出文件路径                                       |
| `totalWidth` / `totalHeight` | `number`  | 合成图尺寸                                         |
| `stopped`                      | `boolean` | 是否被中途停止（停止时输出文件仅包含已合成的条带） |

#### 参数说明

| 参数                         | 类型         | 默认值                                     | 描述                                                   |
| :--------------------------- | :----------- | :----------------------------------------- | :----------------------------------------------------- |
| `options.imagesPath`       | `string`   | **(必填)**                           | 包含源图片的文件夹路径                                 |
| `options.outputPath`       | `string`   | `./merged_image.png`                     | 输出文件路径                                           |
| `options.cols`             | `number`   | `64`                                     | 网格列数                                               |
| `options.rows`             | `number`   | `64`                                     | 网格行数                                               |
| `options.imageWidth`       | `number`   | `256`                                    | 单张图片宽度                                           |
| `options.imageHeight`      | `number`   | `256`                                    | 单张图片高度                                           |
| `options.imagePattern`     | `string`   | `{x}_{y}.png`                            | 文件名模板，支持`{x}` 和 `{y}` 占位符              |
| `options.direction`        | `string`   | [horizontal] (行优先), [vertical] (列优先) |                                                        |
| `options.quality`          | `number`   | `80`                                     | 输出质量 (针对 jpg/webp，由 outputPath 扩展名决定格式) |
| `options.compressionLevel` | `number`   | `6`                                      | PNG 压缩等级 (0-9)                                     |
| `options.onTick`           | `function` | -                                          | 进度回调                                               |

## 注意事项

1. **内存管理**: [mergeImages] 和 [sliceImage] 使用 `sharp` 进行图像处理。对于超大图片，请适当调整 [sharpPixelLimit] 并确保服务器有足够的内存。
2. **并发控制**: [fetchImages] 和 [sliceImage] 均支持并发配置。建议根据网络状况或 CPU 核心数调整 [concurrency] 以获得最佳性能。
3. **文件格式**:
   - [sliceImage] 支持 PNG, JPEG, WebP。
   - [mergeImages] 支持输出为 PNG, JPEG, WebP。
4. **错误处理**: [fetchImages] 不会因单个文件失败而中断整个流程，失败信息会通过 [onTickError] 回调或返回结果中的 [failFiles] 提供。调用 [stop()] 中止时 Promise 不会 reject，而是以已完成部分 resolve（`stopped: true`）。
