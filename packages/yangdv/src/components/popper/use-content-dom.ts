import type { CSSProperties, StyleValue } from 'vue';

import type { UsePopperReturn } from '../../hooks';
import type { PopperContentProps } from './content';
import type { UsePopperContentReturn } from './use-content';

import { computed, ref, unref } from 'vue';

import { useNamespace, useZIndex } from '../../hooks';
import { isNumber } from '../../utils';

export const usePopperContentDOM = (
  props: PopperContentProps,
  {
    attributes,
    styles,
    role,
  }: Pick<UsePopperContentReturn, 'role'> &
    Pick<UsePopperReturn, 'attributes' | 'styles'>,
) => {
  const { nextZIndex } = useZIndex();
  const ns = useNamespace('popper');

  const contentAttrs = computed(() => unref(attributes).popper);
  const contentZIndex = ref<number>(
    isNumber(props.zIndex) ? props.zIndex : nextZIndex(),
  );
  const contentClass = computed(() => [ns.b(), props.popperClass]);
  const contentStyle = computed<StyleValue[]>(() => {
    return [
      { zIndex: unref(contentZIndex) } as CSSProperties,
      unref(styles).popper as CSSProperties,
      props.popperStyle || {},
    ];
  });
  const ariaModal = computed<string | undefined>(() =>
    role.value === 'dialog' ? 'false' : undefined,
  );
  const arrowStyle = computed(
    () => (unref(styles).arrow || {}) as CSSProperties,
  );

  const updateZIndex = () => {
    contentZIndex.value = isNumber(props.zIndex) ? props.zIndex : nextZIndex();
  };

  return {
    ariaModal,
    arrowStyle,
    contentAttrs,
    contentClass,
    contentStyle,
    contentZIndex,

    updateZIndex,
  };
};

export type UsePopperContentDOMReturn = ReturnType<typeof usePopperContentDOM>;
