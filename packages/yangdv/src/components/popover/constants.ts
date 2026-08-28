import type { InjectionKey, Ref } from 'vue';

import type { PopoverTriggerType } from './trigger';

export type PopoverInjectionContext = {
  /**
   * 是否受控
   */
  controlled: Ref<boolean>;
  /**
   * Popover ID
   */
  id: Ref<string>;
  onBeforeHide: () => void;
  onBeforeShow: () => void;
  onClose: (e?: Event) => void;
  onHide: () => void;
  onOpen: (e?: Event) => void;
  onShow: () => void;
  onToggle: (e: Event) => void;
  /**
   * 是否打开
   */
  open: Ref<boolean>;
  /**
   * 触发方式
   */
  trigger: Ref<PopoverTriggerType | PopoverTriggerType[]>;
  updatePopper: () => void;
};

export const POPOVER_INJECTION_KEY: InjectionKey<PopoverInjectionContext> =
  Symbol('Popover');
