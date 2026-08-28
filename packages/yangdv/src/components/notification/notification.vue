<script setup lang="ts">
import type { CSSProperties } from 'vue';

import type { ComponentsMap, NotificationProps } from './type';

import { computed, nextTick, onMounted, ref } from 'vue';

import { useResizeObserver, useTimeoutFn } from '@vueuse/core';

import { useNamespace, useZIndex } from '../../hooks';
import CloseIcon from './CloseIcon.vue';
import { getLastOffset, getOffsetOrSpace } from './instance';

defineOptions({
  name: 'Notification',
});
const props = withDefaults(defineProps<NotificationProps>(), {
  id: '',
  duration: 3000,
  type: 'info',
  showClose: false,
  placement: 'top-right',
  offset: 16,
  dangerouslyUseHTMLString: false,
  content: '',
  onClose: () => {},
});

const emit = defineEmits<{
  (e: 'destroy'): void;
}>();

const ns = useNamespace('notification');

const isStartTransition = ref(false);
const notificationRef = ref<HTMLDivElement>();
const visible = ref(false);
const height = ref(0);
const { currentZIndex, nextZIndex } = useZIndex();

const componentsMap: ComponentsMap = {};

const iconComponent = computed(() => componentsMap[props.type] || '');

let stopTimer: (() => void) | undefined;

const lastOffset = computed(() => getLastOffset(props.id, props.placement));
const curOffset = computed(() => {
  return (
    getOffsetOrSpace(props.id, props.offset, props.placement) + lastOffset.value
  );
});

const horizontalClass = computed(() => {
  if (props.placement.endsWith('left')) return 'left';
  if (props.placement.endsWith('right')) return 'right';
  return 'right';
});

const bottom = computed(() => height.value + curOffset.value);
const verticalClass = computed(() => {
  if (props.placement.startsWith('top')) return 'top';
  if (props.placement.startsWith('bottom')) return 'bottom';
  return 'top';
});

const customStyle = computed<CSSProperties>(() => ({
  [verticalClass.value]: `${curOffset.value}px`,
  zIndex: currentZIndex.value,
}));

function handleClose() {
  visible.value = false;
  // 如果消息从未开始过渡，我们可以立即销毁它
  nextTick(() => {
    if (!isStartTransition.value) {
      props.onClose();
      emit('destroy');
    }
  });
}
function handleDestoy() {
  emit('destroy');
}

function startTimer() {
  if (props.duration === 0) return;
  ({ stop: stopTimer } = useTimeoutFn(() => {
    handleClose();
  }, props.duration));
}
function clearTimer() {
  stopTimer?.();
}

onMounted(() => {
  startTimer();
  nextZIndex();
  visible.value = true;
});

useResizeObserver(notificationRef, () => {
  if (notificationRef.value) {
    height.value = notificationRef.value.getBoundingClientRect().height;
  }
});

defineExpose({
  visible,
  bottom,
  close: handleClose,
});
</script>

<template>
  <transition
    name="y-notification-fade"
    @before-enter="isStartTransition = true"
    @before-leave="onClose"
    @after-leave="handleDestoy"
  >
    <div
      v-if="visible"
      :id="id"
      ref="notificationRef"
      :class="[
        ns.b(),
        ns.b(type),
        ns.is('closable', showClose),
        ns.b(`horizontal-${horizontalClass}`),
        ns.b(`vertical-${verticalClass}`),
      ]"
      :style="customStyle"
      role="alert"
      @mouseenter="clearTimer"
      @mouseleave="startTimer"
    >
      <div v-if="iconComponent" :class="ns.b('icon')">
        <component :is="iconComponent" />
      </div>
      <slot>
        <h2 v-if="title" :class="ns.b('title')">{{ title }}</h2>
        <p v-if="!dangerouslyUseHTMLString" :class="ns.b('content')">
          {{ content }}
        </p>
        <!-- 请注意，消息可能已被篡改，切勿将用户输入用作消息内容 -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <p v-else :class="ns.b('content')" v-html="content"></p>
      </slot>
      <div v-if="showClose" :class="ns.b('close')" @click.stop="handleClose">
        <CloseIcon :class="ns.b('close-icon')" />
      </div>
    </div>
  </transition>
</template>

<style lang="scss">
.y-notification {
  --notification-overlay: #fff;
  --notification-shadow:
    0 6px 16px 0 rgb(0 0 0 / 8%), 0 3px 6px -4px rgb(0 0 0 / 12%);
  --notification-info-color: #333;
  --notification-width: 330px;
  --notification-border-radius: 8px;
  --notification-border-color: #ebeef5;
  --notification-padding: 14px 26px 14px 13px;

  position: fixed;
  box-sizing: border-box;
  width: var(--notification-width);
  min-height: 80px;
  padding: var(--notification-padding);
  word-break: break-all;
  overflow-wrap: break-word;
  background-color: var(--notification-overlay);
  border: 1px solid var(--notification-border-color);
  border-radius: var(--notification-border-radius);
  box-shadow: var(--notification-shadow);
  transition:
    opacity 0.3s,
    transform 0.4s,
    left 0.4s,
    right 0.4s,
    top 0.4s,
    bottom 0.4s;

  &.y-notification-horizontal-left {
    left: 16px;
  }

  &.y-notification-horizontal-right {
    right: 16px;
  }

  p {
    margin: 0;
  }

  .y-notification-title {
    margin: 0;
    margin-bottom: 6px;
    font-size: 16px;
    font-weight: bold;
  }

  .y-notification-content {
    padding: 0;
    font-size: 14px;
    line-height: 1;

    &:focus {
      outline-width: 0;
    }
  }

  .y-notification-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .y-notification-close {
    position: absolute;
    top: 9px;
    right: 12px;
    display: flex;
    align-items: center;
    align-self: flex-start;
    justify-content: center;
    cursor: pointer;
  }

  &.y-notification-info {
    color: var(--notification-info-color);
  }

  svg {
    width: 1em;
    height: 1em;
    color: currentcolor;
  }
}

.y-notification-fade-enter-from {
  &.y-notification-horizontal-right {
    right: 0;
    transform: translateX(100%);
  }

  &.y-notification-horizontal-left {
    left: 0;
    transform: translateX(-100%);
  }
}

.y-notification-fade-leave-to {
  opacity: 0;
}
</style>
