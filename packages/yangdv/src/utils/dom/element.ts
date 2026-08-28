import { isClient, isString } from '../inference';

type GetElementTarget = HTMLElement | null | string | undefined | Window;
type GetElementReturn<T> = T extends string ? HTMLElement | null : T;

export function getElement<T extends GetElementTarget>(
  target: T,
): T extends string ? HTMLElement | null : T {
  if (!isClient || target === '') return null as GetElementReturn<T>;
  if (isString(target)) {
    try {
      return document.querySelector<HTMLElement>(target) as GetElementReturn<T>;
    } catch {
      return null as GetElementReturn<T>;
    }
  }
  return target as GetElementReturn<T>;
}
