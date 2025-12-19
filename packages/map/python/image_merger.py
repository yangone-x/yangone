from PIL import Image
import os
import json
import sys

def merge_images(imagesPath, outputPath, direction='horizontal', imagesPerRow=5, imageWidth=100, imageHeight=100):
    """
    将文件夹中的图片整合成一张大图并返回处理结果
    
    :return: 字典包含状态和输出路径
    """
    try:
        # 验证输入目录是否存在
        if not os.path.exists(imagesPath):
            return {"status": "error", "message": f"图片目录不存在: {imagesPath}"}

        # 获取所有图片文件（忽略非图片文件）
        image_files = [
            f for f in os.listdir(imagesPath) 
            if f.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.gif'))
        ]
        
        if not image_files:
            return {"status": "error", "message": "目录中没有找到图片文件"}
            
        image_files.sort()

        # 计算大图尺寸
        if direction == 'horizontal':
            total_width = imagesPerRow * imageWidth
            total_height = ((len(image_files) + imagesPerRow - 1) // imagesPerRow) * imageHeight
        else:
            total_width = ((len(image_files) + imagesPerRow - 1) // imagesPerRow) * imageWidth
            total_height = imagesPerRow * imageHeight

        # 创建合并后的图片
        merged_image = Image.new('RGB', (total_width, total_height))
        
        for index, image_file in enumerate(image_files):
            img_path = os.path.join(imagesPath, image_file)
            
            try:
                img = Image.open(img_path)
                img = img.resize((imageWidth, imageHeight))
                
                if direction == 'horizontal':
                    x = (index % imagesPerRow) * imageWidth
                    y = (index // imagesPerRow) * imageHeight
                else:
                    x = (index // imagesPerRow) * imageWidth
                    y = (index % imagesPerRow) * imageHeight
                    
                merged_image.paste(img, (x, y))
            except Exception as e:
                print(f"警告：无法处理文件 {image_file}: {str(e)}", file=sys.stderr)

        # 保存结果
        merged_image.save(outputPath)
        return {
            "status": "success",
            "outputPath": os.path.abspath(outputPath),
            "mergedSize": f"{total_width}x{total_height}"
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    try:
        # 从命令行读取JSON配置
        config = json.loads(sys.argv[1])
        result = merge_images(**config)
        print(json.dumps(result))  # 输出JSON格式结果
        
    except json.JSONDecodeError:
        print(json.dumps({"status": "error", "message": "无效的JSON配置"}))
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))
