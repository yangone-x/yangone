import type { Ref, VNode } from 'vue';

import {
  cloneVNode,
  Comment,
  defineComponent,
  Fragment,
  h,
  inject,
  Text,
  withDirectives,
} from 'vue';

import { noop } from '@vueuse/core';

import { FORWARD_REF_INJECTION_KEY, useForwardRefDirective } from '../../hooks';
import { isObject } from '../../utils';

const NAME = 'OnlyChild';

export const OnlyChild = defineComponent({
  name: NAME,
  setup(_, { slots, attrs }) {
    const forwardRefInjection = inject(FORWARD_REF_INJECTION_KEY);
    const forwardRefDirective = useForwardRefDirective(
      forwardRefInjection?.setForwardRef ?? noop,
    );
    return () => {
      const defaultSlot = slots.default?.(attrs);
      if (!defaultSlot) return null;
      const [firstLegitNode, length] = findFirstLegitChild(defaultSlot);

      if (!firstLegitNode) {
        console.warn(NAME, 'no valid child node found');
        return null;
      }
      if (length > 1) {
        console.warn(NAME, 'requires exact only one valid child.');
      }

      return withDirectives(cloneVNode(firstLegitNode, attrs), [
        [forwardRefDirective],
      ]);
    };
  },
});

function findFirstLegitChild(
  node: undefined | VNode[],
): [null | VNode, number] {
  if (!node) return [null, 0];
  const children = node as VNode[];
  const len = children.filter((c) => c.type !== Comment).length;

  for (const child of children) {
    /**
     * when user uses h(Fragment, [text]) to render plain string,
     * this switch case just cannot handle, when the value is primitives
     * we should just return the wrapped string
     */
    if (isObject(child)) {
      switch (child.type) {
        case Comment: {
          continue;
        }
        case 'svg':
        case Text: {
          return [wrapTextContent(child), len];
        }
        case Fragment: {
          return findFirstLegitChild(child.children as VNode[]);
        }
        default: {
          return [child, len];
        }
      }
    }
    return [wrapTextContent(child), len];
  }
  return [null, 0];
}

function wrapTextContent(s: string | VNode) {
  return h('span', { class: 'y-only-child-content' }, [s]);
}

export type OnlyChildExpose = {
  forwardRef: Ref<HTMLElement>;
};
