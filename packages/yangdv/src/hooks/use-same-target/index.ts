const NOOP = () => {};

/**
 * 处理鼠标点击，严格校验：按下、抬起都必须落在绑定事件的元素本身（currentTarget），才执行回调
 * @param handleClick - 真正需要执行的点击回调函数
 * @returns 返回三个事件处理器：onClick、onMousedown、onMouseup，**必须全部绑定到DOM上，缺一不可**
 */
export function useSameTarget(handleClick?: (e: MouseEvent) => void) {
  // 没有传入回调，全部返回空函数
  if (!handleClick) {
    return { onClick: NOOP, onMousedown: NOOP, onMouseup: NOOP };
  }

  let mousedownTarget = false;
  let mouseupTarget = false;

  // 事件顺序：mousedown → mouseup → click
  const onClick = (e: MouseEvent) => {
    // 只有按下、抬起都在当前元素，才执行回调
    if (mousedownTarget && mouseupTarget) {
      handleClick(e);
    }
    // 重置标记
    mousedownTarget = mouseupTarget = false;
  };

  const onMousedown = (e: MouseEvent) => {
    // 判断：鼠标按下的目标是否是当前绑定事件的元素
    mousedownTarget = e.target === e.currentTarget;
  };

  const onMouseup = (e: MouseEvent) => {
    // 判断：鼠标松开的目标是否是当前绑定事件的元素
    mouseupTarget = e.target === e.currentTarget;
  };

  return { onClick, onMousedown, onMouseup };
}
