import type { ComponentInternalInstance, VNode } from 'vue';

import type { MessageHandler, MessagePlacement, MessageProps } from './type';

import { shallowReactive } from 'vue';

export type MessageContext = {
  handler: MessageHandler;
  id: string;
  props: MessageProps;
  vm: ComponentInternalInstance;
  vnode: VNode;
};

export const placementInstances = shallowReactive(
  {} as Record<MessagePlacement, MessageContext[]>,
);

export const getOrCreatePlacementInstances = (placement: MessagePlacement) => {
  if (!placementInstances[placement]) {
    placementInstances[placement] = shallowReactive([]);
  }
  return placementInstances[placement];
};

export const getInstance = (id: string, placement: MessagePlacement) => {
  const instances = placementInstances[placement] || [];
  const idx = instances.findIndex((instance) => instance.id === id);
  const current = instances[idx];
  let prev: MessageContext | undefined;
  if (idx > 0) {
    prev = instances[idx - 1];
  }
  return { current, prev };
};

export const getLastOffset = (
  id: string,
  placement: MessagePlacement,
): number => {
  const { prev } = getInstance(id, placement);
  if (!prev) return 0;
  const bottomValue = prev.vm?.exposed?.bottom?.value;
  return bottomValue ?? 0;
};

export const getOffsetOrSpace = (
  id: string,
  offset: number,
  placement: MessagePlacement,
) => {
  const instances = placementInstances[placement] || [];
  const idx = instances.findIndex((instance) => instance.id === id);
  return idx > 0 ? 16 : offset;
};
