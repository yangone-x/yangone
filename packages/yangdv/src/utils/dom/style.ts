export function classNameToArray(cls = '') {
  return cls.split(' ').filter((item) => !!item.trim());
}

export function hasClass(el: Element, cls: string): boolean {
  if (!el || !cls) return false;
  if (cls.includes(' ')) throw new Error('className should not contain space.');
  return el.classList.contains(cls);
}

export function addClass(el: Element, cls: string) {
  if (!el || !cls.trim()) return;
  el.classList.add(...classNameToArray(cls));
}

export function removeClass(el: Element, cls: string) {
  if (!el || !cls.trim()) return;
  el.classList.remove(...classNameToArray(cls));
}
