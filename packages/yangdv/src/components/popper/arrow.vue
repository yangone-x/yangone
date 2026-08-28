<script lang="ts" setup>
import { inject, onBeforeUnmount } from 'vue';

import { useNamespace } from '../../hooks/use-namespace';
import { POPPER_CONTENT_INJECTION_KEY } from './constants';

defineOptions({
  name: 'PopperArrow',
  inheritAttrs: false,
});
const ns = useNamespace('popper');

// oxlint-disable-next-line typescript/no-non-null-assertion
const { arrowRef, arrowStyle } = inject(
  POPPER_CONTENT_INJECTION_KEY,
  undefined,
)!;

onBeforeUnmount(() => {
  arrowRef.value = undefined;
});

defineExpose({
  /**
   * @description Arrow element
   */
  arrowRef,
});
</script>

<template>
  <span
    ref="arrowRef"
    :class="ns.b('arrow')"
    :style="arrowStyle"
    data-popper-arrow
  ></span>
</template>
