export interface AnchorProps {
  /**
   * @description 元素开始触发锚点的偏移量
   * @default 15
   */
  bound?: number;
  /**
   * @description scroll container
   */
  container?: HTMLElement | null | string | Window;
  /**
   * @description 设置点击锚点时容器的滚动持续时间，单位为毫秒
   *  @default 300
   */
  duration?: number;
  /**
   * @description 设置锚点滚动的偏移量
   * @default 0
   */
  offset?: number;
  /**
   * @description 滚动查看链接是否在顶部被选中
   * @default false
   */
  selectScrollTop?: boolean;
}

export interface AnchorEmits {
  (e: 'click', event: MouseEvent, href?: string): void;
  (e: 'change', href: string): void;
}

export interface AnchorLinkProps {
  href: string;
}
