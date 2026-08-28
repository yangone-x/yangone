import type { ComponentInternalInstance, VNode } from 'vue';

import type {
  NotificationHandler,
  NotificationPlacement,
  NotificationProps,
} from './type';

import { shallowReactive } from 'vue';

export type NotificationContext = {
  handler: NotificationHandler;
  id: string;
  props: NotificationProps;
  vm: ComponentInternalInstance;
  vnode: VNode;
};

export const placementInstances = shallowReactive(
  {} as Record<NotificationPlacement, NotificationContext[]>,
);

export const getOrCreatePlacementInstances = (
  placement: NotificationPlacement,
) => {
  if (!placementInstances[placement]) {
    placementInstances[placement] = shallowReactive([]);
  }
  return placementInstances[placement];
};

export const getInstance = (id: string, placement: NotificationPlacement) => {
  const instances = placementInstances[placement] || [];
  const idx = instances.findIndex((instance) => instance.id === id);
  const current = instances[idx];
  let prev: NotificationContext | undefined;
  if (idx > 0) {
    prev = instances[idx - 1];
  }
  return { current, prev };
};

export const getLastOffset = (
  id: string,
  placement: NotificationPlacement,
): number => {
  const { prev } = getInstance(id, placement);
  if (!prev) return 0;
  const bottomValue = prev.vm?.exposed?.bottom?.value;
  return bottomValue ?? 0;
};

export const getOffsetOrSpace = (
  id: string,
  offset: number,
  placement: NotificationPlacement,
) => {
  const instances = placementInstances[placement] || [];
  const idx = instances.findIndex((instance) => instance.id === id);
  return idx > 0 ? 16 : offset;
};
