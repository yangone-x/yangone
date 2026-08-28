<script setup lang="ts">
import type { AnchorLinkState } from './constants';
import type { AnchorEmits, AnchorProps } from './type';

import { onMounted, provide, ref, watch } from 'vue';

import { useEventListener } from '@vueuse/core';

import { useNamespace } from '../../hooks/use-namespace';
import {
  animateScrollTo,
  getElement,
  getOffsetTopDistance,
  getScrollElement,
  getScrollTop,
  isUndefined,
  isWindow,
  throttleByRaf,
} from '../../utils';
import { anchorKey } from './constants';

defineOptions({ name: 'Anchor' });

const props = withDefaults(defineProps<AnchorProps>(), {
  duration: 300,
  offset: 0,
  bound: 15,
  selectScrollTop: true,
});

const emit = defineEmits<AnchorEmits>();

const ns = useNamespace('anchor');

const links = new Map<string, HTMLElement>();
const currentAnchor = ref('');
const containerEl = ref<HTMLElement | Window>();

let isScrolling = false;
let currentScrollTop = 0;

function addLink(state: AnchorLinkState) {
  links.set(state.href, state.el);
}

function removeLink(href: string) {
  links.delete(href);
}

function setCurrentAnchor(href: string) {
  const activeHref = currentAnchor.value;
  if (activeHref !== href) {
    currentAnchor.value = href;
    emit('change', href);
  }
}

let clearAnimate: (() => void) | null = null;
let currentTargetHref = '';

function scrollToAnchor(href: string) {
  if (!containerEl.value) return;
  const target = getElement(href);
  if (!target) return;

  if (clearAnimate) {
    if (currentTargetHref === href) return;
    clearAnimate();
  }

  currentTargetHref = href;
  isScrolling = true;
  const scrollEle = getScrollElement(target, containerEl.value);
  const distance = getOffsetTopDistance(target, scrollEle);
  const max = scrollEle.scrollHeight - scrollEle.clientHeight;
  const to = Math.min(distance - props.offset, max);
  clearAnimate = animateScrollTo(
    containerEl.value,
    currentScrollTop,
    to,
    props.duration,
    () => {
      // make sure it is executed after throttleByRaf's handleScroll
      setTimeout(() => {
        isScrolling = false;
        currentTargetHref = '';
      }, 20);
    },
  );
}

function scrollTo(href?: string) {
  if (href) {
    setCurrentAnchor(href);
    scrollToAnchor(href);
  }
}

function handleClick(e: MouseEvent, href?: string) {
  emit('click', e, href);
  scrollTo(href);
}

const handleScroll = throttleByRaf(() => {
  if (containerEl.value) {
    currentScrollTop = getScrollTop(containerEl.value);
  }
  const currentHref = getCurrentHref();
  if (isScrolling || isUndefined(currentHref)) return;
  setCurrentAnchor(currentHref);
});

function getCurrentHref() {
  if (!containerEl.value) return;
  const scrollTop = getScrollTop(containerEl.value);

  const anchorTopList: { href: string; top: number }[] = [];

  links.forEach((_, href) => {
    const target = getElement(href);
    if (target && containerEl.value) {
      const scrollEle = getScrollElement(target, containerEl.value);
      const distance = getOffsetTopDistance(target, scrollEle);
      anchorTopList.push({
        top: distance - props.offset - props.bound,
        href,
      });
    }
  });
  anchorTopList.sort((prev, next) => prev.top - next.top);
  for (let i = 0; i < anchorTopList.length; i++) {
    const item = anchorTopList[i];
    const next = anchorTopList[i + 1];

    if (item) {
      if (i === 0 && scrollTop === 0) {
        return props.selectScrollTop ? item.href : '';
      }
      if (item.top <= scrollTop && (!next || next.top > scrollTop)) {
        return item.href;
      }
    }
  }
}

function getContainer() {
  const el = getElement(props.container);
  containerEl.value = !el || isWindow(el) ? window : el;
}

useEventListener(containerEl, 'scroll', handleScroll);

onMounted(() => {
  getContainer();
  const hash = decodeURIComponent(window.location.hash);
  const target = hash ? document.querySelector(hash) : null;

  if (target) {
    scrollTo(hash);
  } else {
    handleScroll();
  }
});

watch(
  () => props.container,
  () => {
    getContainer();
  },
);

provide(anchorKey, {
  currentAnchor,
  addLink,
  removeLink,
  handleClick,
});

defineExpose({
  scrollTo,
});
</script>

<template>
  <div :class="ns.b()">
    <slot></slot>
  </div>
</template>
