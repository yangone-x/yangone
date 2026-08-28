/**
 * 获取元素到页面的距离
 * @param el 目标元素
 * @returns 元素到页面的距离
 */
export function getOffsetTop(el: HTMLElement) {
  let offset = 0;
  let parent = el;

  while (parent) {
    offset += parent.offsetTop;
    parent = parent.offsetParent as HTMLElement;
  }

  return offset;
}

/**
 * 获取元素到容器的距离
 * @param el 目标元素
 * @param containerEl 容器元素
 * @returns 元素到容器的距离
 */
export function getOffsetTopDistance(
  el: HTMLElement,
  containerEl: HTMLElement,
) {
  return Math.abs(getOffsetTop(el) - getOffsetTop(containerEl));
}
