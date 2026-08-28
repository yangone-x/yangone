<script setup lang="ts">
import type { WatchStopHandle } from 'vue';

import type { PopperContentProps } from './content';

import { onBeforeUnmount, onMounted, provide, unref, watch } from 'vue';

import { isElement, isEmpty } from '../../utils';
import { POPPER_CONTENT_INJECTION_KEY } from './constants';
import { usePopperContent } from './use-content';
import { usePopperContentDOM } from './use-content-dom';

defineOptions({
  name: 'PopperContent',
});

const props = withDefaults(defineProps<PopperContentProps>(), {
  placement: 'bottom',
  boundariesPadding: 0,
  offset: 12,
  strategy: 'fixed',
  enterable: true,
  stopPopperMouseEvent: true,
});

const emit = defineEmits<{
  (e: 'mouseenter' | 'mouseleave', event: MouseEvent): void;
}>();

const { attributes, arrowRef, contentRef, styles, instanceRef, role, update } =
  usePopperContent(props);

const {
  ariaModal,
  arrowStyle,
  contentAttrs,
  contentClass,
  contentStyle,
  updateZIndex,
} = usePopperContentDOM(props, {
  styles,
  attributes,
  role,
});

provide(POPPER_CONTENT_INJECTION_KEY, {
  arrowStyle,
  arrowRef,
});

let triggerTargetAriaStopWatch: undefined | WatchStopHandle;

function updatePopper(shouldUpdateZIndex = true) {
  update();
  if (shouldUpdateZIndex) {
    updateZIndex();
  }
}

function togglePopperAlive() {
  updatePopper(false);
  if (props.visible && props.focusOnShow) {
    // trapped.value = true
  } else if (props.visible === false) {
    // trapped.value = false
  }
}

onMounted(() => {
  watch(
    () => props.triggerTargetEl,
    (triggerTargetEl, prevTriggerTargetEl) => {
      triggerTargetAriaStopWatch?.();
      triggerTargetAriaStopWatch = undefined;

      const el = unref(triggerTargetEl || contentRef.value);
      const prevEl = unref(prevTriggerTargetEl || contentRef.value);

      if (isElement(el)) {
        triggerTargetAriaStopWatch = watch(
          [role, () => props.ariaLabel, ariaModal, () => props.id],
          (watches) => {
            ['role', 'aria-label', 'aria-modal', 'id'].forEach((key, idx) => {
              if (isEmpty(watches[idx])) {
                el?.removeAttribute(key);
              } else {
                // oxlint-disable-next-line typescript/no-non-null-assertion
                el?.setAttribute(key, watches[idx]!);
              }
            });
          },
          { immediate: true },
        );
      }
      if (prevEl !== el && isElement(prevEl)) {
        ['role', 'aria-label', 'aria-modal', 'id'].forEach((key) => {
          prevEl?.removeAttribute(key);
        });
      }
    },
    { immediate: true },
  );

  watch(() => props.visible, togglePopperAlive, { immediate: true });
});

onBeforeUnmount(() => {
  triggerTargetAriaStopWatch?.();
  triggerTargetAriaStopWatch = undefined;
  contentRef.value = undefined;
});

defineExpose({
  /**
   * @description popper content element
   */
  popperContentRef: contentRef,
  /**
   * @description popperjs instance
   */
  popperInstanceRef: instanceRef,
  /**
   * @description method for updating popper
   */
  updatePopper,

  /**
   * @description content style
   */
  contentStyle,
});
</script>

<template>
  <div
    ref="contentRef"
    v-bind="contentAttrs"
    :style="contentStyle"
    :class="contentClass"
    tabindex="-1"
    @mouseenter="(e) => emit('mouseenter', e)"
    @mouseleave="(e) => emit('mouseleave', e)"
  >
    <slot></slot>
  </div>
</template>
