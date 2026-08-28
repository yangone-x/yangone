import type { PopperProps } from '../popper';
import type { PopoverContentProps } from './content';
import type Popover from './popover.vue';
import type { PopoverTriggerProps } from './trigger';

export interface PopoverEmits {
  (
    e: 'beforeHide' | 'beforeShow' | 'close' | 'hide' | 'open' | 'show',
    event?: Event,
  ): void;
}

export interface PopoverProps
  extends PopoverContentProps, PopoverTriggerProps, PopperProps {
  /**
   *  自动消失，以毫秒为单位，在受控模式下无效
   * @default 0
   */
  autoClose?: number;
  /**
   * 消失延迟，以毫秒为单位，在受控模式下无效
   * @default 200
   */
  hideAfter?: number;
  /**
   *  出现延迟，以毫秒为单位，在受控模式下无效
   * @default 0
   */
  showAfter?: number;
  /**
   * Popover 内容是否有箭头
   * @default true
   */
  showArrow?: boolean;
}

export type PopoverInstance = InstanceType<typeof Popover>;
