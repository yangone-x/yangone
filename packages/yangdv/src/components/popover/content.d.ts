import type { PopperContentProps } from '../popper';
import type Content from './content.vue';

export interface PopoverContentProps extends PopperContentProps {
  /**
   *  内容附加到哪个元素
   */
  appendTo?: string;
  /**
   *  显示内容，可以被 `slot#content` 覆盖
   */
  content?: string;
  /**
   *  是否禁用Popover
   */
  disabled?: boolean;
  /**
   *  当工具提示未激活且 `persistent` 为 `false` 时，确认弹窗将被销毁
   */
  persistent?: boolean;
  /**
   *  当工具提示未激活且 `persistent` 为 `false` 时，确认弹窗将被销毁
   */
  persistent?: boolean;
  /**
   *  是否将 `content` 视为 HTML 字符串
   */
  rawContent?: boolean;
  /**
   *  Popover是否被传送，如果为 `true`，它将被传送到 `append-to` 设置的位置
   * @default true
   */
  teleported?: boolean;
  /**
   *  动画名称
   */
  transition?: string;
}

export type PopoverContentInstance = InstanceType<typeof Content>;
