/**
 * 自动绑定类实例上的所有方法到实例本身
 * 确保方法作为回调使用时 this 指向正确
 * @param instance - 需要绑定方法的类实例
 */
export function bindMethods<T extends object>(instance: T): void {
  // 获取实例的原型对象
  const prototype = Object.getPrototypeOf(instance);
  // 获取原型上的所有属性名
  const propertyNames = Object.getOwnPropertyNames(prototype);

  propertyNames.forEach((propertyName) => {
    // 获取属性描述符
    const descriptor = Object.getOwnPropertyDescriptor(prototype, propertyName);
    // 获取实例上的属性值
    const propertyValue = instance[propertyName as keyof T];

    // 筛选条件：是函数、非构造函数、非访问器属性
    if (
      typeof propertyValue === 'function' &&
      propertyName !== 'constructor' &&
      descriptor &&
      !descriptor.get &&
      !descriptor.set
    ) {
      // 将方法绑定到当前实例并重新赋值
      instance[propertyName as keyof T] = propertyValue.bind(instance);
    }
  });
}

/**
 * 预加载图片数组
 * 等待所有图片加载完成，返回加载结果
 * @param images - 图片 URL 数组
 * @returns Promise<{ loaded: string[], failed: string[] }> 加载成功和失败的图片列表
 */
export function preloadImages(
  images: string[],
): Promise<{ failed: string[]; loaded: string[] }> {
  const loaded: string[] = [];
  const failed: string[] = [];

  const promises = images.map((src) => {
    return new Promise<void>((resolve) => {
      const img = new Image();

      img.addEventListener('load', () => {
        loaded.push(src);
        resolve();
      });

      img.addEventListener('error', () => {
        failed.push(src);
        resolve(); // 确保 Promise 始终 resolved，不影响 Promise.all
      });

      img.src = src;
    });
  });

  return Promise.all(promises).then(() => ({ loaded, failed }));
}
