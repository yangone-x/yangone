from PIL import Image
Image.MAX_IMAGE_PIXELS = None  # 添加这行来禁用图片大小限制
import os
import math
import json
import sys

def create_tiles(imagesPath, outputPath, tileSize=256):
    try:
        # 验证输入路径
        if not os.path.exists(imagesPath):
            return {"status": "error", "message": f"输入图片不存在: {imagesPath}"}
        
        # 创建输出目录
        os.makedirs(outputPath, exist_ok=True)
        
        # 打开图片
        img = Image.open(imagesPath)
        width, height = img.size
        
        # 尺寸建议（非强制）
        # if img.size != (16384, 16384):
        #     print(f"警告：当前图片尺寸为 {img.size}，建议尺寸为 16384x16384")
        
        # 计算缩放级别
        max_zoom = 6
        generated_tiles = 0
        
        # 生成瓦片
        for zoom in range(max_zoom + 1):
            scale = 1 / (2 ** (max_zoom - zoom))
            current_size = (int(width * scale), int(height * scale))
            scaled_img = img.resize(current_size, Image.Resampling.LANCZOS)
            
            cols = math.ceil(current_size[0] / tileSize)
            rows = math.ceil(current_size[1] / tileSize)
            
            for x in range(cols):
                for y in range(rows):
                    # 裁剪瓦片
                    bounds = (
                        x * tileSize,
                        y * tileSize,
                        min((x + 1) * tileSize, current_size[0]),
                        min((y + 1) * tileSize, current_size[1])
                    )
                    tile = scaled_img.crop(bounds)
                    
                    # 处理非标准尺寸瓦片
                    if tile.size != (tileSize, tileSize):
                        new_tile = Image.new('RGB', (tileSize, tileSize), (255, 255, 255))
                        new_tile.paste(tile, (0, 0))
                        tile = new_tile
                    
                    # 保存瓦片
                    tile_dir = os.path.join(outputPath, str(zoom), str(x))
                    os.makedirs(tile_dir, exist_ok=True)
                    tile_path = os.path.join(tile_dir, f'{y}.png')
                    tile.save(tile_path, 'PNG', optimize=True, quality=85)
                    generated_tiles += 1
        
        # 返回结构化结果
        return {
            "status": "success",
            "outputPath": os.path.abspath(outputPath),
            "tilesGenerated": generated_tiles,
            "originalSize": f"{width}x{height}",
            "maxZoom": max_zoom
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    # 从命令行参数获取JSON配置
    config_str = sys.argv[1]
    config = json.loads(config_str)
    result = create_tiles(**config)
    print(json.dumps(result))
