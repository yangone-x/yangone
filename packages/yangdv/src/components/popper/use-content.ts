import type { Modifier } from '@popperjs/core';

import type { PartialOptions } from '../../hooks';
import type { PopperContentProps } from './content';

import {
  computed,
  inject,
  onBeforeUnmount,
  onMounted,
  ref,
  unref,
  watch,
} from 'vue';

import { usePopper } from '../../hooks';
import { isUndefined } from '../../utils';
import { POPPER_INJECTION_KEY } from './constants';
import { buildPopperOptions, unwrapMeasurableEl } from './utils';

const DEFAULT_ARROW_OFFSET = 0;

export const usePopperContent = (props: PopperContentProps) => {
  const injected = inject(POPPER_INJECTION_KEY, undefined);

  if (!injected) {
    throw new Error(
      'Popper injection not found. Make sure to use the provider.',
    );
  }

  const { popperInstanceRef, contentRef, triggerRef, role } = injected;

  const arrowRef = ref<HTMLElement>();
  const arrowOffset = computed(() => props.arrowOffset);

  const eventListenerModifier = computed(() => {
    return {
      name: 'eventListeners',
      enabled: !!props.visible,
    } as Modifier<'eventListeners', any>;
  });

  const arrowModifier = computed(() => {
    const arrowEl = unref(arrowRef);
    const offset = unref(arrowOffset) ?? DEFAULT_ARROW_OFFSET;
    // Seems like the `phase` and `fn` is required by Modifier type
    // But on its documentation they didn't specify that.
    // Refer to https://popper.js.org/docs/v2/modifiers/arrow/
    return {
      name: 'arrow',
      enabled: !isUndefined(arrowEl),
      options: {
        element: arrowEl,
        padding: offset,
      },
    } as any;
  });

  const options = computed<PartialOptions>(() => {
    return {
      onFirstUpdate: () => {
        update();
      },
      ...buildPopperOptions(props, [
        unref(arrowModifier),
        unref(eventListenerModifier),
      ]),
    };
  });

  const computedReference = computed(
    () => unwrapMeasurableEl(props.referenceEl) || unref(triggerRef),
  );

  const { attributes, state, styles, update, forceUpdate, instanceRef } =
    usePopper(computedReference, contentRef, options);

  watch(instanceRef, (instance) => (popperInstanceRef.value = instance), {
    flush: 'sync',
  });

  onMounted(() => {
    watch(
      () => unref(computedReference)?.getBoundingClientRect?.(),
      () => {
        update();
      },
    );
  });

  onBeforeUnmount(() => {
    popperInstanceRef.value = undefined;
  });

  return {
    attributes,
    arrowRef,
    contentRef,
    instanceRef,
    state,
    styles,
    role,
    forceUpdate,
    update,
  };
};

export type UsePopperContentReturn = ReturnType<typeof usePopperContent>;
