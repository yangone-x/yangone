import type { Modifier } from '@popperjs/core';

import type { ComponentPublicInstance, MaybeRef } from 'vue';

import type { Measurable } from './constants';
import type { PopperCoreConfigProps } from './content';

import { unrefElement } from '@vueuse/core';

import { isClient } from '../../utils';

export const buildPopperOptions = (
  props: PopperCoreConfigProps,
  modifiers: Modifier<any, any>[] = [],
) => {
  const { placement, strategy, popperOptions } = props;
  const options = {
    placement,
    strategy,
    ...popperOptions,
    modifiers: [...genModifiers(props), ...modifiers],
  };

  deriveExtraModifiers(options, popperOptions?.modifiers);
  return options;
};

export const unwrapMeasurableEl = (
  $el: MaybeRef<ComponentPublicInstance | Measurable | undefined>,
) => {
  if (!isClient) return;
  return unrefElement($el as HTMLElement);
};

function genModifiers(options: PopperCoreConfigProps) {
  const { offset, gpuAcceleration, fallbackPlacements } = options;
  return [
    {
      name: 'offset',
      options: {
        offset: [0, offset ?? 12],
      },
    },
    {
      name: 'preventOverflow',
      options: {
        padding: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
        },
      },
    },
    {
      name: 'flip',
      options: {
        padding: 5,
        fallbackPlacements,
      },
    },
    {
      name: 'computeStyles',
      options: {
        gpuAcceleration,
      },
    },
  ];
}

function deriveExtraModifiers(
  options: any,
  modifiers: Array<Partial<Modifier<any, any>>> = [],
) {
  if (modifiers) {
    options.modifiers = [...options.modifiers, ...(modifiers ?? [])];
  }
}
