<!-- eslint-disable n/prefer-global/process -->
<script setup lang="ts">
import type { Fn } from '@vueuse/core';

import type { PopperContentInstance } from '../popper';
import type { PopoverContentProps } from './content';

import { computed, inject, onBeforeUnmount, ref, unref, watch } from 'vue';

import { onClickOutside } from '@vueuse/core';
import { castArray } from 'lodash-es';

import { composeEventHandlers, focusElement } from '../../utils';
import { PopperContent } from '../popper';
import { POPOVER_INJECTION_KEY } from './constants';
import { isTriggerType } from './utils';

defineOptions({ name: 'PopoverContent', inheritAttrs: false });

const props = withDefaults(defineProps<PopoverContentProps>(), {
  teleported: true,
  appendTo: 'body',
});

const contentRef = ref<PopperContentInstance>();
const popperContentRef = computed(() => contentRef.value?.popperContentRef);
let stopHandle: Fn;
const {
  controlled,
  id,
  open,
  trigger,
  onClose,
  onOpen,
  onShow,
  onHide,
  onBeforeShow,
  onBeforeHide,
  // oxlint-disable-next-line typescript/no-non-null-assertion
} = inject(POPOVER_INJECTION_KEY, undefined)!;

const transitionName = computed(() => {
  return props.transition || `y-fade-in-linear`;
});

const persistentRef = computed(() => {
  // For testing, we would always want the content to be rendered
  // to the DOM, so we need to return true here.

  if (
    process.env.NODE_ENV === 'test' &&
    !process.env.RUN_TEST_WITH_PERSISTENT
  ) {
    return true;
  }
  return props.persistent;
});

onBeforeUnmount(() => {
  stopHandle?.();
});

const shouldRender = computed(() => {
  return unref(persistentRef) ? true : unref(open);
});

const shouldShow = computed(() => {
  return props.disabled ? false : unref(open);
});

const ariaHidden = ref(true);

const onAfterLeave = () => {
  onHide();
  if (isFocusInsideContent()) {
    focusElement(document.body, { preventScroll: true });
  } else {
    ariaHidden.value = true;
  }
};

const stopWhenControlled = () => {
  if (unref(controlled)) return true;
};

const onContentEnter = composeEventHandlers(stopWhenControlled, () => {
  if (props.enterable && isTriggerType(unref(trigger), 'hover')) {
    onOpen();
  }
});

const onContentLeave = composeEventHandlers(stopWhenControlled, () => {
  if (isTriggerType(unref(trigger), 'hover')) {
    onClose();
  }
});

const onBeforeEnter = () => {
  contentRef.value?.updatePopper?.();
  onBeforeShow?.();
};

const onBeforeLeave = () => {
  onBeforeHide?.();
};

const onAfterShow = () => {
  onShow();
};

const onBlur = () => {
  if (!props.virtualTriggering) {
    onClose();
  }
};

const isFocusInsideContent = (event?: FocusEvent) => {
  const popperContent: HTMLElement | undefined =
    contentRef.value?.popperContentRef;
  const activeElement =
    (event?.relatedTarget as Node) || document.activeElement;

  return popperContent?.contains(activeElement);
};

watch(
  () => unref(open),
  (val) => {
    if (val) {
      ariaHidden.value = false;
      stopHandle = onClickOutside(
        popperContentRef,
        () => {
          if (unref(controlled)) return;
          const needClose = castArray(unref(trigger)).every((item) => {
            return item !== 'hover' && item !== 'focus';
          });
          if (needClose) {
            onClose();
          }
        },
        { detectIframe: true },
      );
    } else {
      stopHandle?.();
    }
  },
  {
    flush: 'post',
  },
);

watch(
  () => props.content,
  () => {
    contentRef.value?.updatePopper?.();
  },
);

defineExpose({
  /**
   * @description el-popper-content component instance
   */
  contentRef,
  /**
   * @description validate current focus event is trigger inside el-popper-content
   */
  isFocusInsideContent,
});
</script>

<template>
  <Teleport :disabled="!teleported" :to="appendTo">
    <transition
      v-if="shouldRender || !ariaHidden"
      :name="transitionName"
      :appear="!persistentRef"
      @after-leave="onAfterLeave"
      @before-enter="onBeforeEnter"
      @after-enter="onAfterShow"
      @before-leave="onBeforeLeave"
    >
      <PopperContent
        v-show="shouldShow"
        :id="id"
        ref="contentRef"
        v-bind="$attrs"
        :aria-label="ariaLabel"
        :aria-hidden="ariaHidden"
        :boundaries-padding="boundariesPadding"
        :fallback-placements="fallbackPlacements"
        :gpu-acceleration="gpuAcceleration"
        :offset="offset"
        :placement="placement"
        :popper-options="popperOptions"
        :arrow-offset="arrowOffset"
        :strategy="strategy"
        :enterable="enterable"
        :popper-class="popperClass"
        :reference-el="referenceEl"
        :trigger-target-el="triggerTargetEl"
        :visible="shouldShow"
        :z-index="zIndex"
        @mouseenter="onContentEnter"
        @mouseleave="onContentLeave"
        @blur="onBlur"
        @close="onClose"
      >
        <slot></slot>
      </PopperContent>
    </transition>
  </Teleport>
</template>
