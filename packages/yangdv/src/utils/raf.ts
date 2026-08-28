import { isClient } from './inference';

export function rAF(fn: () => void) {
  return isClient
    ? window.requestAnimationFrame(fn)
    : (setTimeout(fn, 16) as unknown as number);
}
export function cAF(handle: number) {
  return isClient ? window.cancelAnimationFrame(handle) : clearTimeout(handle);
}

export function throttleByRaf(cb: (...args: any[]) => void) {
  let timer = 0;

  const throttle = (...args: any[]): void => {
    if (timer) {
      cAF(timer);
    }
    timer = rAF(() => {
      cb(...args);
      timer = 0;
    });
  };

  throttle.cancel = () => {
    cAF(timer);
    timer = 0;
  };

  return throttle;
}
