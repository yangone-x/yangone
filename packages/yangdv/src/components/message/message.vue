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

const bottom = computed(() => height.value + curOffset.value);

const horizontalClass = computed(() => {
  if (props.placement.endsWith('left')) return ns.is('left');
  if (props.placement.endsWith('right')) return ns.is('right');
  return ns.is('right');
});

const verticalProperty = computed(() =>
  props.placement.startsWith('top') ? 'top' : 'bottom',
);

const customStyle = computed<CSSProperties>(() => ({
  [verticalProperty.value]: `${curOffset.value}px`,
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
        { [ns.m(type)]: type },
        ns.is('plain', plain),
        ns.is('closable', showClose),
        ns.is('bottom', verticalProperty === 'bottom'),
        horizontalClass,
      ]"
      :style="customStyle"
      role="alert"
      @mouseenter="clearTimer"
      @mouseleave="startTimer"
    >
      <div v-if="repeatNum > 1" :class="ns.e('badge')">{{ repeatNum }}</div>
      <div v-if="iconComponent" :class="ns.e('icon')">
        <component :is="iconComponent" />
      </div>
      <slot>
        <p v-if="!dangerouslyUseHTMLString" :class="ns.e('content')">
          {{ content }}
        </p>
        <!-- 请注意，消息可能已被篡改，切勿将用户输入用作消息内容 -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <p v-else :class="ns.e('content')" v-html="content"></p>
      </slot>
      <div v-if="showClose" :class="ns.b('close')" @click.stop="handleClose">
        <CloseIcon />
      </div>
    </div>
  </transition>
</template>
