<script setup lang="ts">
import type { ModalEmits, ModalProps } from './type';

import { onMounted, ref, watch } from 'vue';

import { useId, useLockscreen, useNamespace, useZIndex } from '../../hooks';

defineOptions({
  name: 'Modal',
  inheritAttrs: false,
});

const props = withDefaults(defineProps<ModalProps>(), {
  appendTo: 'body',
  appendToBody: true,
  mask: true,
  maskClosable: true,
  destroyOnClose: true,
  lockScroll: true,
});

const emit = defineEmits<ModalEmits>();

const ns = useNamespace('modal');

const bodyId = useId();
const { nextZIndex } = useZIndex();

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
      name="y-modal"
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
          v-if="rendered"
          :class="ns.b('wrap')"
          role="dialog"
          aria-modal="true"
        >
          <slot></slot>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style lang="scss">
.y-modal-root {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateZ(0);
  transition: opacity 0.3s;

  .y-modal-mask {
    position: absolute;
    inset: 0;
    background-color: rgb(0 0 0 / 50%);

    &.is-hidden {
      opacity: 0;
    }
  }

  .y-modal-wrap {
    position: relative;
    transition: all 0.3s;
  }
}

.y-modal-enter-from {
  opacity: 0;
}

.y-modal-leave-to {
  opacity: 0;
}

.y-modal-enter-from .y-modal-wrap,
.y-modal-leave-to .y-modal-wrap {
  transform: scale(0.9);
}
</style>
