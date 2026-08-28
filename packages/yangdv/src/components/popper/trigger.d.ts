import type { Measurable } from './constants';
import type Trigger from './trigger.vue';

export interface PopperTriggerProps {
  id?: string;
  onBlur?: (e: FocusEvent) => void;
  onClick?: (e: PointerEvent) => void;
  onContextmenu?: (e: PointerEvent) => void;
  onFocus?: (e: FocusEvent) => void;
  onKeydown?: (e: KeyboardEvent) => void;
  onMouseenter?: (e: MouseEvent) => void;
  onMouseleave?: (e: MouseEvent) => void;
  /**
   * 开启状态
   */
  open?: boolean;
  /**
   * 标识虚拟触发时的触发元素
   */
  virtualRef?: Measurable;
  /**
   * 用来标识虚拟触发是否被启用
   * */
  virtualTriggering?: boolean;
}

export type PopperTriggerInstance = InstanceType<typeof Trigger>;
