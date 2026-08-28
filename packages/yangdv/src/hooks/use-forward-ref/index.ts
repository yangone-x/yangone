import type { InjectionKey, ObjectDirective, Ref } from 'vue';

import { provide } from 'vue';

type ForwardRefSetter = <T>(el: T) => void;

export type ForwardRefInjectionContext = {
  setForwardRef: ForwardRefSetter;
};

export const FORWARD_REF_INJECTION_KEY: InjectionKey<ForwardRefInjectionContext> =
  Symbol('fxForwardRef');

export const useForwardRef = <T>(forwardRef: Ref<null | T>) => {
  const setForwardRef = ((el: T) => {
    forwardRef.value = el;
  }) as ForwardRefSetter;

  provide(FORWARD_REF_INJECTION_KEY, {
    setForwardRef,
  });
};

export const useForwardRefDirective = (
  setForwardRef: ForwardRefSetter,
): ObjectDirective => {
  return {
    mounted(el) {
      setForwardRef(el);
    },
    updated(el) {
      setForwardRef(el);
    },
    unmounted() {
      setForwardRef(null);
    },
  };
};
