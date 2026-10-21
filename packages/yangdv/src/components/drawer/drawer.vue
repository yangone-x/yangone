<script setup lang="ts">
import type { DrawerEmits, DrawerProps } from './type';

import { onMounted, ref, watch } from 'vue';

import { useId, useLockscreen, useNamespace, useZIndex } from '../../hooks';
import { useResizable } from './use-resizable';

defineOptions({
  name: 'Drawer',
  inheritAttrs: false,
});

const props = withDefaults(defineProps<DrawerProps>(), {
  appendTo: 'body',
  appendToBody: true,
  mask: true,
  maskClosable: true,
  destroyOnClose: true,
  lockScroll: true,
  direction: 'rtl',
  resizable: false,
});
const emit = defineEmits<DrawerEmits>();
const ns = useNamespace('drawer');
const bodyId = useId();
const { nextZIndex } = useZIndex();

const draggerRef = ref<HTMLElement>();

const { isHorizontal, size, isResizing } = useResizable(
  {
    direction: props.direction,
    resizable: props.resizable,
  },
  draggerRef,
  emit,
);

const visible = ref(false); // 显示状态
const rendered = ref(false); // 默认情况下，如果 destroyOnClose 为 true，则初始化为 false，否则为 true
const curZIndex = ref(props.zIndex ?? nextZIndex()); // 弹窗的层级
const modelValue = defineModel<boolean>('modelValue', {
  default: false,
});

if (props.lockScroll) {
  useLockscreen(visible);
}

watch(modelValue, (val) => {
  if (val) {
    visible.value = true;
    rendered.value = true;
    curZIndex.value = props.zIndex ?? nextZIndex();
  } else {
    handleBeforeClose();
  }
});

// 展示前触发
function handleBeforeEnter() {
  emit('open');
}
// 展示后触发
function handleAfterEnter() {
  emit('opened');
}
// 隐藏前触发
function handleBeforeLeave() {
  emit('close');
}
// 隐藏后触发
function handleAfterLeave() {
  emit('closed');
  if (props.destroyOnClose) {
    rendered.value = false;
  }
}

function handleBeforeClose() {
  function hide(shouldCancel?: boolean) {
    if (shouldCancel) return;
    visible.value = false;
    modelValue.value = false;
  }

  if (props.beforeClose) {
    props.beforeClose(hide);
  } else {
    visible.value = false;
    modelValue.value = false;
  }
}

function handleClickMask() {
  if (props.maskClosable) {
    handleBeforeClose();
  }
}

onMounted(() => {
  if (modelValue.value) {
    visible.value = true;
    rendered.value = true;
  }
});
</script>

<template>
  <Teleport
    :to="appendTo"
    :disabled="appendTo !== 'body' ? false : !appendToBody"
  >
    <Transition
      :name="ns.b('fade')"
      @before-enter="handleBeforeEnter"
      @after-enter="handleAfterEnter"
      @before-leave="handleBeforeLeave"
      @after-leave="handleAfterLeave"
    >
      <div
        v-show="visible"
        :class="ns.b('root')"
        :style="{ zIndex: curZIndex }"
        :aria-describedby="bodyId"
      >
        <div
          :class="[ns.b('mask'), ns.is('hidden', !mask)]"
          @click="handleClickMask"
        ></div>
        <div
          :class="[ns.b('wrap'), direction, ns.is('dragging', isResizing)]"
          :style="{ [isHorizontal ? 'width' : 'height']: size }"
          role="dialog"
          aria-modal="true"
        >
          <slot v-if="rendered"></slot>
          <div
            v-if="resizable"
            ref="draggerRef"
            :class="ns.b('dragger')"
            :style="{ zIndex }"
          ></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
