<script lang="ts" setup>
import type { WatchStopHandle } from 'vue';

import type { PopperTriggerProps } from './trigger';

import { computed, inject, onBeforeUnmount, onMounted, watch } from 'vue';

import { unrefElement } from '@vueuse/core';

import { useForwardRef } from '../../hooks';
import { isElement, isFocusable } from '../../utils';
import { OnlyChild } from '../only-child';
import { POPPER_INJECTION_KEY } from './constants';

defineOptions({
  name: 'PopperTrigger',
  inheritAttrs: false,
});

const props = defineProps<PopperTriggerProps>();

// oxlint-disable-next-line typescript/no-non-null-assertion
const { role, triggerRef } = inject(POPPER_INJECTION_KEY, undefined)!;

useForwardRef(triggerRef);

const ariaControls = computed<string | undefined>(() => {
  return ariaHaspopup.value ? props.id : undefined;
});

const ariaDescribedby = computed<string | undefined>(() => {
  if (role && role.value === 'tooltip') {
    return props.open && props.id ? props.id : undefined;
  }
  return undefined;
});

const ariaHaspopup = computed<string | undefined>(() => {
  if (role && role.value !== 'tooltip') {
    return role.value;
  }
  return undefined;
});

const ariaExpanded = computed<string | undefined>(() => {
  return ariaHaspopup.value ? `${props.open}` : undefined;
});

let virtualTriggerAriaStopWatch: undefined | WatchStopHandle;

const TRIGGER_ELE_EVENTS = [
  'onMouseenter',
  'onMouseleave',
  'onClick',
  'onKeydown',
  'onFocus',
  'onBlur',
  'onContextmenu',
] as const;

onMounted(() => {
  watch(
    () => props.virtualRef,
    (virtualEl) => {
      if (virtualEl) {
        triggerRef.value = unrefElement(virtualEl as HTMLElement);
      }
    },
    {
      immediate: true,
    },
  );

  watch(
    triggerRef,
    (el, prevEl) => {
      virtualTriggerAriaStopWatch?.();
      virtualTriggerAriaStopWatch = undefined;

      if (isElement(prevEl)) {
        TRIGGER_ELE_EVENTS.forEach((eventName) => {
          const handler = props[eventName] as EventListener;
          if (handler) {
            prevEl.removeEventListener(
              eventName.slice(2).toLowerCase(),
              handler,
              ['onBlur', 'onFocus'].includes(eventName),
            );
          }
        });
      }
      if (isElement(el)) {
        TRIGGER_ELE_EVENTS.forEach((eventName) => {
          const handler = props[eventName] as EventListener;
          if (handler) {
            el.addEventListener(
              eventName.slice(2).toLowerCase(),
              handler,
              ['onBlur', 'onFocus'].includes(eventName),
            );
          }
        });
        if (isFocusable(el as HTMLElement)) {
          virtualTriggerAriaStopWatch = watch(
            [ariaControls, ariaDescribedby, ariaHaspopup, ariaExpanded],
            (watches) => {
              [
                'aria-controls',
                'aria-describedby',
                'aria-haspopup',
                'aria-expanded',
              ].forEach((key, idx) => {
                if (watches[idx]) {
                  el.setAttribute(key, watches[idx]);
                } else {
                  el.removeAttribute(key);
                }
              });
            },
            { immediate: true },
          );
        }
      }
      if (isElement(prevEl) && isFocusable(prevEl as HTMLElement)) {
        [
          'aria-controls',
          'aria-describedby',
          'aria-haspopup',
          'aria-expanded',
        ].forEach((key) => prevEl.removeAttribute(key));
      }
    },
    {
      immediate: true,
    },
  );
});

onBeforeUnmount(() => {
  virtualTriggerAriaStopWatch?.();
  virtualTriggerAriaStopWatch = undefined;
  if (triggerRef.value && isElement(triggerRef.value)) {
    const el = triggerRef.value as HTMLElement;
    TRIGGER_ELE_EVENTS.forEach((eventName) => {
      const handler = props[eventName] as EventListener;
      if (handler) {
        el.removeEventListener(
          eventName.slice(2).toLowerCase(),
          handler,
          ['onBlur', 'onFocus'].includes(eventName),
        );
      }
    });
    triggerRef.value = undefined;
  }
});

defineExpose({
  /**
   * trigger element
   */
  triggerRef,
});
</script>

<template>
  <OnlyChild
    v-if="!virtualTriggering"
    v-bind="$attrs"
    :aria-controls="ariaControls"
    :aria-describedby="ariaDescribedby"
    :aria-expanded="ariaExpanded"
    :aria-haspopup="ariaHaspopup"
  >
    <slot></slot>
  </OnlyChild>
</template>
