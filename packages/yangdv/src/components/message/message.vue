<script setup lang="ts">
import type { CSSProperties } from 'vue';

import type { ComponentsMap, MessageProps } from './type';

import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { useResizeObserver, useTimeoutFn } from '@vueuse/core';

import { useNamespace, useZIndex } from '../../hooks';
import CloseIcon from './CloseIcon.vue';
import { getLastOffset, getOffsetOrSpace } from './instance';
import LoadingIcon from './LoadingIcon.vue';

defineOptions({
  name: 'Message',
});
const props = withDefaults(defineProps<MessageProps>(), {
  id: '',
  duration: 3000,
  type: 'info',
  showClose: false,
  placement: 'top-center',
  offset: 16,
  dangerouslyUseHTMLString: false,
  content: '',
  repeatNum: 1,
  plain: true,
  onClose: () => {},
});
const emit = defineEmits<{
  (e: 'destroy'): void;
}>();
const ns = useNamespace('message');

const isStartTransition = ref(false);
const messageRef = ref<HTMLDivElement>();
const visible = ref(false);
const height = ref(0);
const { currentZIndex, nextZIndex } = useZIndex();

const componentsMap: ComponentsMap = {
  loading: LoadingIcon,
};

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
  return 'center';
});

const bottom = computed(() => height.value + curOffset.value);
const verticalClass = computed(() => {
  if (props.placement.startsWith('top')) return 'top';
  if (props.placement.startsWith('bottom')) return 'bottom';
  return 'center';
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

watch(
  () => props.repeatNum,
  () => {
    clearTimer();
    startTimer();
  },
);

onMounted(() => {
  startTimer();
  nextZIndex();
  visible.value = true;
});

useResizeObserver(messageRef, () => {
  if (messageRef.value) {
    height.value = messageRef.value.getBoundingClientRect().height;
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
    name="y-message-fade"
    @before-enter="isStartTransition = true"
    @before-leave="onClose"
    @after-leave="handleDestoy"
  >
    <div
      v-if="visible"
      :id="id"
      ref="messageRef"
      :class="[
        ns.b(),
        ns.b(type),
        ns.is('plain', plain),
        ns.is('closable', showClose),
        ns.b(`horizontal-${horizontalClass}`),
        ns.b(`vertical-${verticalClass}`),
      ]"
      :style="customStyle"
      role="alert"
      @mouseenter="clearTimer"
      @mouseleave="startTimer"
    >
      <div v-if="repeatNum > 1" :class="ns.b('badge')">{{ repeatNum }}</div>
      <div v-if="iconComponent" :class="ns.b('icon')">
        <component :is="iconComponent" />
      </div>
      <slot>
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
.y-message {
  --message-plain-overlay: #fff;
  --message-plain-shadow:
    0 6px 16px 0 rgb(0 0 0 / 8%), 0 3px 6px -4px rgb(0 0 0 / 12%);
  --message-info-color: #333;

  position: fixed;
  box-sizing: border-box;
  display: flex;
  gap: 8px;
  align-items: center;
  width: fit-content;
  max-width: calc(100% - 32px);
  padding: 9px 12px;
  word-break: break-all;
  border-radius: 4px;
  transition:
    opacity 0.3s,
    transform 0.4s,
    top 0.4s,
    bottom 0.4s;

  &.y-message-horizontal-left {
    left: 16px;
  }

  &.y-message-horizontal-right {
    right: 16px;
  }

  &.y-message-horizontal-center {
    right: 0;
    left: 0;
    margin: 0 auto;
  }

  p {
    margin: 0;
  }

  .y-message-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    padding: 0 6px;
    font-size: 14px;
    color: white;
    border-radius: 10px;
  }

  .y-message-content {
    padding: 0;
    font-size: 14px;
    line-height: 1;

    &:focus {
      outline-width: 0;
    }
  }

  .y-message-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .y-message-close {
    display: flex;
    align-items: center;
    align-self: flex-start;
    justify-content: center;
    cursor: pointer;
  }

  &.y-message-info {
    color: var(--message-info-color);
    background-color: rgb(0 0 0 / 60%);

    .y-message-badge {
      background-color: var(--message-info-color);
    }
  }

  &.is-plain {
    background-color: var(--message-plain-overlay);
    border-color: var(--message-plain-overlay);
    box-shadow: var(--message-plain-shadow);
  }

  svg {
    width: 1em;
    height: 1em;
    color: currentcolor;
  }
}

.y-message-fade-enter-from,
.y-message-fade-leave-to {
  opacity: 0;
  transform: translateY(-100%);

  &.y-message-vertical-bottom {
    transform: translateY(100%);
  }
}
</style>
