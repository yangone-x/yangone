<script lang="ts" setup>
import type { OnlyChildExpose } from '../only-child';
import type { PopoverTriggerProps } from './trigger';

import { inject, nextTick, ref, toRef, unref } from 'vue';

import { useNamespace } from '../../hooks/use-namespace';
import { composeEventHandlers, focusElement } from '../../utils';
import { PopperTrigger } from '../popper';
import { POPOVER_INJECTION_KEY } from './constants';
import { whenTrigger } from './utils';

defineOptions({
  name: 'TooltipTrigger',
});
const props = withDefaults(defineProps<PopoverTriggerProps>(), {
  trigger: 'hover',
  triggerKeys: () => ['Enter', 'NumpadEnter', 'Space'],
});

const ns = useNamespace('popover');

// oxlint-disable-next-line typescript/no-non-null-assertion
const { controlled, id, open, onOpen, onClose, onToggle } = inject(
  POPOVER_INJECTION_KEY,
  undefined,
)!;

const triggerRef = ref<null | OnlyChildExpose>(null);

const stopWhenControlledOrDisabled = () => {
  if (unref(controlled) || props.disabled) {
    return true;
  }
};
const trigger = toRef(props, 'trigger');
const onMouseenter = composeEventHandlers(
  stopWhenControlledOrDisabled,
  whenTrigger(trigger, 'hover', (e) => {
    onOpen(e);

    if (props.focusOnTarget && e.target) {
      nextTick(() => {
        focusElement(e.target as HTMLElement, { preventScroll: true });
      });
    }
  }),
);
const onMouseleave = composeEventHandlers(
  stopWhenControlledOrDisabled,
  whenTrigger(trigger, 'hover', onClose),
);
const onClick = composeEventHandlers(
  stopWhenControlledOrDisabled,
  whenTrigger(trigger, 'click', (e) => {
    // distinguish left click
    if ((e as MouseEvent).button === 0) {
      onToggle(e);
    }
  }),
);

const onFocus = composeEventHandlers(
  stopWhenControlledOrDisabled,
  whenTrigger(trigger, 'focus', onOpen),
);

const onBlur = composeEventHandlers(
  stopWhenControlledOrDisabled,
  whenTrigger(trigger, 'focus', onClose),
);

const onContextMenu = composeEventHandlers(
  stopWhenControlledOrDisabled,
  whenTrigger(trigger, 'contextmenu', (e: Event) => {
    e.preventDefault();
    onToggle(e);
  }),
);

const onKeydown = composeEventHandlers(
  stopWhenControlledOrDisabled,
  (e: KeyboardEvent) => {
    if (props.triggerKeys.includes(e.code)) {
      e.preventDefault();
      onToggle(e);
    }
  },
);

defineExpose({
  /**
   * @description trigger element
   */
  triggerRef,
});
</script>

<template>
  <PopperTrigger
    :id="id"
    :virtual-ref="virtualRef"
    :open="open"
    :virtual-triggering="virtualTriggering"
    :class="ns.b('trigger')"
    @blur="onBlur"
    @click="onClick"
    @contextmenu="onContextMenu"
    @focus="onFocus"
    @mouseenter="onMouseenter"
    @mouseleave="onMouseleave"
    @keydown="onKeydown"
  >
    <slot></slot>
  </PopperTrigger>
</template>
