import { isElement } from '../inference';

/**
 * @desc Determine if target element is focusable
 * @param element {HTMLElement}
 * @returns {Boolean} true if it is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  if (
    element.tabIndex > 0 ||
    (element.tabIndex === 0 && element.getAttribute('tabIndex') !== null)
  ) {
    return true;
  }
  if (
    element.tabIndex < 0 ||
    element.hasAttribute('disabled') ||
    element.getAttribute('aria-disabled') === 'true'
  ) {
    return false;
  }

  switch (element.nodeName) {
    case 'A': {
      // casting current element to Specific HTMLElement in order to be more type precise
      return (
        !!(element as HTMLAnchorElement).href &&
        (element as HTMLAnchorElement).rel !== 'ignore'
      );
    }
    case 'BUTTON':
    case 'SELECT':
    case 'TEXTAREA': {
      return true;
    }
    case 'INPUT': {
      return !(
        (element as HTMLInputElement).type === 'hidden' ||
        (element as HTMLInputElement).type === 'file'
      );
    }
    default: {
      return false;
    }
  }
}

export function focusElement(
  el?: HTMLElement | null | { focus: () => void },
  options?: FocusOptions,
) {
  if (!el || !el.focus) return;
  let cleanup: boolean = false;

  if (isElement(el) && !isFocusable(el) && !el.getAttribute('tabindex')) {
    el.setAttribute('tabindex', '-1');
    cleanup = true;
  }

  el.focus(options);

  if (isElement(el) && cleanup) {
    el.removeAttribute('tabindex');
  }
}
