import type Arrow from './arrow.vue';

export interface PopperArrowProps {
  /**
   * @default 5
   */
  arrowOffset?: number;
}

export type PopperArrowInstance = InstanceType<typeof Arrow>;
