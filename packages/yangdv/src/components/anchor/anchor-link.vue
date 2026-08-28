<script setup lang="ts">
import type { AnchorLinkProps } from './type';

import { inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useNamespace } from '../../hooks/use-namespace';
import { anchorKey } from './constants';

defineOptions({
  name: 'AnchorLink',
});

const props = defineProps<AnchorLinkProps>();

const ns = useNamespace('anchor');

const linkRef = ref<HTMLElement | null>(null);

const {
  currentAnchor,
  addLink,
  removeLink,
  handleClick: contextHandleClick,
  // oxlint-disable-next-line typescript/no-non-null-assertion
} = inject(anchorKey)!;

function handleClick(e: MouseEvent) {
  contextHandleClick(e, props.href);
}

watch(
  () => props.href,
  (val, oldVal) => {
    nextTick(() => {
      if (oldVal) removeLink(oldVal);
      if (val && linkRef.value) {
        addLink({
          href: val,
          el: linkRef.value,
        });
      }
    });
  },
);

onMounted(() => {
  if (props.href && linkRef.value) {
    addLink({
      href: props.href,
      el: linkRef.value,
    });
  }
});

onBeforeUnmount(() => {
  if (props.href) {
    removeLink(props.href);
  }
});
</script>

<template>
  <a
    ref="linkRef"
    :class="[ns.e('link'), ns.is('active', currentAnchor === href)]"
    :href="href"
    @click="handleClick"
  >
    <slot></slot>
  </a>
</template>
