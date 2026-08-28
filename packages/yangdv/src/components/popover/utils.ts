import type { Ref } from 'vue';

import type { PopoverTriggerType } from './trigger';

import { unref } from 'vue';

export function isTriggerType(
  trigger: PopoverTriggerType | PopoverTriggerType[],
  type: PopoverTriggerType,
) {
  if (Array.isArray(trigger)) {
    return trigger.includes(type);
  }
  return trigger === type;
}

export function whenTrigger(
  trigger: Ref<PopoverTriggerType | PopoverTriggerType[]>,
  type: PopoverTriggerType,
  handler: (e: Event) => void,
) {
  return (e: Event) => {
    if (isTriggerType(unref(trigger), type)) {
      handler(e);
    }
  };
}
