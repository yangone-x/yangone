import type { Instance } from '@popperjs/core';

import type { ComputedRef, CSSProperties, InjectionKey, Ref } from 'vue';

export type Measurable = {
  getBoundingClientRect: () => DOMRect;
};

export type PopperInjectionContext = {
  /**
   *  popper 内容的元素
   */
  contentRef: Ref<HTMLElement | undefined>;
  popperInstanceRef: Ref<Instance | undefined>;
  /**
   *  popper 内容相对的元素
   */
  referenceRef: Ref<Measurable | undefined>;
  role: ComputedRef<string>;
  /**
   * 触发 popper 的元素
   */
  triggerRef: Ref<Measurable | undefined>;
};

export type PopperContentInjectionContext = {
  arrowRef: Ref<HTMLElement | undefined>;
  arrowStyle: ComputedRef<CSSProperties>;
};

export const POPPER_INJECTION_KEY: InjectionKey<PopperInjectionContext> =
  Symbol('popper');

export const POPPER_CONTENT_INJECTION_KEY: InjectionKey<PopperContentInjectionContext> =
  Symbol('popperContent');
