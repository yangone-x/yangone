<script lang="ts" setup>
import type { PopperInstance } from '../popper';
import type { PopoverContentInstance } from './content';
import type { PopoverEmits, PopoverProps } from './popover';

import {
  computed,
  getCurrentInstance,
  onDeactivated,
  provide,
  readonly,
  ref,
  toRef,
  unref,
  watch,
} from 'vue';

import { useDelayedToggle, useId } from '../../hooks';
import { Popper, PopperArrow } from '../popper';
import { POPOVER_INJECTION_KEY } from './constants';
import PopoverContent from './content.vue';
import PopoverTrigger from './trigger.vue';

defineOptions({
  name: 'Popover',
});

const props = withDefaults(defineProps<PopoverProps>(), {
  showArrow: true,
  trigger: 'hover',
  teleported: true,
  appendTo: 'body',
  hideAfter: 200,
});
const emit = defineEmits<PopoverEmits>();
// 获取当前实例
const instance = getCurrentInstance();

// 是否受控
const controlled = computed(() => {
  const bindings = instance?.vnode.props || {};
  return 'onUpdate:visible' in bindings;
});

const id = useId();
const popperRef = ref<PopperInstance>();
const contentRef = ref<PopoverContentInstance>();

const updatePopper = () => {
  const popperComponent = unref(popperRef);
  if (popperComponent) {
    popperComponent.popperInstanceRef?.update();
  }
};
const open = ref(false);
const toggleReason = ref<Event>();
const visible = defineModel('visible', {
  default: false,
  type: Boolean,
});

function show(event?: Event) {
  if (open.value === true) {
    return;
  }
  toggleReason.value = event;
  open.value = true;
  visible.value = true;
}
function hide(event?: Event) {
  if (open.value === false) {
    return;
  }
  toggleReason.value = event;
  open.value = false;
  visible.value = false;
}

watch(visible, (visible) => {
  if (visible) {
    show();
  } else {
    hide();
  }
});

const { onOpen, onClose } = useDelayedToggle({
  showAfter: props.showAfter,
  hideAfter: props.hideAfter,
  autoClose: props.autoClose,
  open: show,
  close: hide,
});

const kls = computed(() => {
  return ['y-popover', props?.popperClass ?? ''];
});

provide(POPOVER_INJECTION_KEY, {
  controlled,
  id,
  open: readonly(open),
  trigger: toRef(props, 'trigger'),
  onOpen,
  onClose,
  onToggle: (event?: Event) => {
    if (unref(open)) {
      onClose(event);
    } else {
      onOpen(event);
    }
  },
  onShow: () => {
    emit('show', toggleReason.value);
  },
  onHide: () => {
    emit('hide', toggleReason.value);
  },
  onBeforeShow: () => {
    emit('beforeShow', toggleReason.value);
  },
  onBeforeHide: () => {
    emit('beforeHide', toggleReason.value);
  },
  updatePopper,
});

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled && open.value) {
      open.value = false;
    }
  },
);

const isFocusInsideContent = (event?: FocusEvent) => {
  return contentRef.value?.isFocusInsideContent(event);
};

onDeactivated(() => open.value && hide());

defineExpose({
  /**
   * popper 组件实例
   */
  popperRef,
  /**
   * tooltip-content 组件实例
   */
  contentRef,
  /**
   * 验证当前焦点事件是否在 tooltip-content 中触发
   */
  isFocusInsideContent,
  /**
   * 更新 popper组件实例
   */
  updatePopper,
  /**
   * onOpen 方法控制 popover 显示状态
   */
  onOpen,
  /**
   * onClose 方法控制 popover 显示状态
   */
  onClose,
  /**
   * 提供 hide 方法
   */
  hide,
});
</script>

<template>
  <Popper ref="popperRef" :role="role">
    <PopoverTrigger
      :disabled="disabled"
      :trigger="trigger"
      :trigger-keys="triggerKeys"
      :virtual-ref="virtualRef"
      :virtual-triggering="virtualTriggering"
      :focus-on-target="focusOnTarget"
    >
      <slot v-if="$slots.default"></slot>
    </PopoverTrigger>
    <PopoverContent
      ref="contentRef"
      :aria-label="ariaLabel"
      :boundaries-padding="boundariesPadding"
      :content="content"
      :disabled="disabled"
      :enterable="enterable"
      :fallback-placements="fallbackPlacements"
      :hide-after="hideAfter"
      :gpu-acceleration="gpuAcceleration"
      :offset="offset"
      :persistent="persistent"
      :popper-class="kls"
      :popper-style="popperStyle"
      :placement="placement"
      :popper-options="popperOptions"
      :arrow-offset="arrowOffset"
      :raw-content="rawContent"
      :reference-el="referenceEl"
      :trigger-target-el="triggerTargetEl"
      :show-after="showAfter"
      :strategy="strategy"
      :teleported="teleported"
      :transition="transition"
      :virtual-triggering="virtualTriggering"
      :z-index="zIndex"
      :append-to="appendTo"
    >
      <slot name="content">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span v-if="rawContent" v-html="content"></span>
        <span v-else>{{ content }}</span>
      </slot>
      <PopperArrow v-if="showArrow" />
    </PopoverContent>
  </Popper>
</template>
