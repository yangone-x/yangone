import type { Ref } from 'vue';

import { computed, isRef, onScopeDispose, watch } from 'vue';

import {
  addClass,
  getScrollBarWidth,
  hasClass,
  removeClass,
} from '../../utils';

/**
 * 钩子用来监控 ref 值以锁定或解锁屏幕。
 * 当触发条件为真时，它假定模态窗口已打开，反之亦然。
 * @param trigger {Ref<boolean>}
 */
export const useLockscreen = (trigger: Ref<boolean>) => {
  if (!isRef(trigger)) {
    console.warn(
      '[useLockscreen]',
      'You need to pass a ref param to this function',
    );
  }

  const hiddenCls = computed(() => 'fx-popup-parent--hidden');

  let scrollBarWidth = 0;
  let withoutHiddenClass = false;
  let bodyWidth = '0';

  const cleanup = () => {
    setTimeout(() => {
      // When the test case is running, the context environment simulated by jsdom may have been destroyed,
      // and the document does not exist at this time.
      if (typeof document === 'undefined') return;
      if (withoutHiddenClass && document) {
        document.body.style.width = bodyWidth;
        removeClass(document.body, hiddenCls.value);
      }
    }, 200);
  };
  watch(trigger, (val) => {
    if (!val) {
      cleanup();
      return;
    }

    withoutHiddenClass = !hasClass(document.body, hiddenCls.value);
    if (withoutHiddenClass) {
      bodyWidth = document.body.style.width;
      addClass(document.body, hiddenCls.value);
    }
    scrollBarWidth = getScrollBarWidth();
    const bodyHasOverflow =
      document.documentElement.clientHeight < document.body.scrollHeight;
    const bodyOverflowY = getComputedStyle(document.body, null).overflowY;
    if (
      scrollBarWidth > 0 &&
      (bodyHasOverflow || bodyOverflowY === 'scroll') &&
      withoutHiddenClass
    ) {
      document.body.style.width = `calc(100% - ${scrollBarWidth}px)`;
    }
  });
  onScopeDispose(() => cleanup());
};
