import type { PopperTriggerProps } from '../popper';

export type PopoverTriggerType = 'click' | 'contextmenu' | 'focus' | 'hover';

export interface PopoverTriggerProps extends PopperTriggerProps {
  /**
   *  Popover 是否被禁用
   */
  disabled?: boolean;
  /**
   * 当通过悬停触发Popover时，是否聚焦触发元素，这可以提高可访问性
   */
  focusOnTarget?: boolean;
  /**
   * Popover 应如何触发（显示），在受控模式下无效
   * @default 'hover'
   */
  trigger?: PopoverTriggerType;
  /**
   * 当你点击鼠标以聚焦触发元素时，你可以定义一组键盘代码，通过键盘控制Popover的显示，在受控模式下无效
   * @default ['Enter', 'NumpadEnter', 'Space']
   */
  triggerKeys?: string[];
}
