<script lang="ts" setup>
import type { Instance as PopperInstance } from '@popperjs/core';

import type { PopperInjectionContext } from './constants';
import type { PopperProps } from './popper';

import { computed, provide, ref } from 'vue';

import { POPPER_INJECTION_KEY } from './constants';

defineOptions({
  name: 'Popper',
  inheritAttrs: false,
});
const props = withDefaults(defineProps<PopperProps>(), {
  role: 'tooltip',
});

const triggerRef = ref<HTMLElement>();
const popperInstanceRef = ref<PopperInstance>();
const contentRef = ref<HTMLElement>();
const referenceRef = ref<HTMLElement>();
const role = computed(() => props.role);

const popperProvides = {
  /**
   *  trigger element
   */
  triggerRef,
  /**
   *  popperjs instance
   */
  popperInstanceRef,
  /**
   *  popper content element
   */
  contentRef,
  /**
   *  popper reference element
   */
  referenceRef,
  /**
   *  角色决定了 aria 属性的分配方式
   */
  role,
} as PopperInjectionContext;

defineExpose(popperProvides);

provide(POPPER_INJECTION_KEY, popperProvides);
</script>

<template>
  <slot></slot>
</template>
