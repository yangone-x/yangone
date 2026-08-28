import type { InjectionKey, Ref } from 'vue';

export interface AnchorLinkState {
  el: HTMLElement;
  href: string;
}

export interface AnchorContext {
  addLink(state: AnchorLinkState): void;
  currentAnchor: Ref<string>;
  handleClick(e: MouseEvent, href?: string): void;
  removeLink(href: string): void;
}

export const anchorKey: InjectionKey<AnchorContext> = Symbol('anchor');
