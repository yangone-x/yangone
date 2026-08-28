import { easeInOutCubic } from '../easings';
import { isClient, isFunction, isWindow } from '../inference';
import { cAF, rAF } from '../raf';

let scrollBarWidth: number;
export function getScrollBarWidth(): number {
  if (!isClient) return 0;
  if (scrollBarWidth !== undefined) return scrollBarWidth;

  const outer = document.createElement('div');
  outer.className = `fx-scrollbar__wrap`;
  outer.style.visibility = 'hidden';
  outer.style.width = '100px';
  outer.style.position = 'absolute';
  outer.style.top = '-9999px';
  document.body.append(outer);

  const widthNoScroll = outer.offsetWidth;
  outer.style.overflow = 'scroll';

  const inner = document.createElement('div');
  inner.style.width = '100%';
  outer.append(inner);

  const widthWithScroll = inner.offsetWidth;
  outer.remove();
  scrollBarWidth = widthNoScroll - widthWithScroll;

  return scrollBarWidth;
}

export function animateScrollTo(
  container: HTMLElement | Window,
  from: number,
  to: number,
  duration: number,
  callback?: unknown,
) {
  const startTime = Date.now();

  let handle: number | undefined;
  const scroll = () => {
    const timestamp = Date.now();
    const time = timestamp - startTime;
    const nextScrollTop = easeInOutCubic(
      Math.min(time, duration),
      from,
      to,
      duration,
    );

    if (isWindow(container)) {
      container.scrollTo(window.pageXOffset, nextScrollTop);
    } else {
      container.scrollTop = nextScrollTop;
    }
    if (time < duration) {
      handle = rAF(scroll);
    } else if (isFunction(callback)) {
      callback();
    }
  };

  scroll();

  return () => {
    handle && cAF(handle);
  };
}

export function getScrollElement(
  target: HTMLElement,
  container: HTMLElement | Window,
) {
  if (isWindow(container)) {
    return target.ownerDocument.documentElement;
  }
  return container;
}

export function getScrollTop(container: HTMLElement | Window) {
  if (isWindow(container)) {
    return window.scrollY;
  }
  return container.scrollTop;
}
