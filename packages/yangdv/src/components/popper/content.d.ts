import type { Options, Placement } from '@popperjs/core';

import type { CSSProperties } from 'vue';

import type { PopperArrowProps } from './arrow';
import type Content from './content.vue';

type ClassObjectType = Record<string, boolean>;
export type ClassType = ClassObjectType | ClassType[] | string;

export interface PopperCoreConfigProps {
  /**
   * @default 0
   */
  boundariesPadding?: number;
  /**
   * 可用的 positions 请查看[popper.js 文档](https://popper.js.org/docs/v2/modifiers/flip/#fallbackplacements)
   */
  fallbackPlacements?: Placement[];
  /**
   * gpu 加速
   * @default true
   */
  gpuAcceleration?: boolean;
  /**
   * 出现位置的偏移量
   * @default 12
   */
  offset?: number;
  /**
   * 出现的位置
   */
  placement?: Placement;
  /**
   * popper.js 的配置项 [popper.js](https://popper.js.org/docs/v2/) parameters
   */
  popperOptions?: Partial<Options>;
  /**
   * 定位方式
   */
  strategy?: 'absolute' | 'fixed';
}

export interface PopperContentProps
  extends PopperArrowProps, PopperCoreConfigProps {
  ariaLabel?: string;
  className?: ClassType;
  /**
   * 鼠标是否可进入到 popper 中
   */
  enterable?: boolean;
  focusOnShow?: boolean;
  id?: string;
  /**
   * popper 添加类名
   */
  popperClass?: ClassType;
  /**
   * popper 添加自定义样式
   */
  popperStyle?: CSSProperties;
  referenceEl?: HTMLElement;
  stopPopperMouseEvent?: boolean;
  style?: CSSProperties;
  triggerTargetEl?: HTMLElement;
  virtualTriggering?: boolean;
  /**
   * 可见性
   */
  visible?: boolean;
  zIndex?: number;
}

export type PopperContentInstance = InstanceType<typeof Content>;
