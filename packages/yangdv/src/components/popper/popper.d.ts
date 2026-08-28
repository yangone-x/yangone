import type Popper from './popper.vue';

export type RoleType =
  | 'dialog'
  | 'grid'
  | 'group'
  | 'listbox'
  | 'menu'
  | 'navigation'
  | 'tooltip'
  | 'tree';

export type PopperTriggerType = 'click' | 'contextmenu' | 'focus' | 'hover';

export interface PopperProps {
  /**
   * @default 'tooltip'
   */
  role?: RoleType;
}

export type PopperInstance = InstanceType<typeof Popper>;
