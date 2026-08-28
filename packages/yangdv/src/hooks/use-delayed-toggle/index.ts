import { unref } from 'vue';

import { isNumber } from '../../utils';
import { useTimeout } from '../use-timeout';

export interface UseDelayedToggleProps {
  /**
   *  自动消失，毫秒级，在受控模式下无效
   * @default 0
   */
  autoClose?: number;
  close: (event?: Event) => void;
  /**
   * 消失延迟，单位为毫秒，控制模式下无效
   * @default 200
   */
  hideAfter?: number;
  open: (event?: Event) => void;
  /**
   *  出现延迟，以毫秒为单位，在受控模式下无效
   * @default 0
   */
  showAfter?: number;
}

export function useDelayedToggle({
  showAfter = 0,
  hideAfter = 200,
  autoClose = 0,
  open,
  close,
}: UseDelayedToggleProps) {
  const { registerTimeout } = useTimeout();
  const {
    registerTimeout: registerTimeoutForAutoClose,
    cancelTimeout: cancelTimeoutForAutoClose,
  } = useTimeout();

  const onOpen = (event?: Event, delay = unref(showAfter)) => {
    registerTimeout(() => {
      open(event);

      const _autoClose = unref(autoClose);
      if (isNumber(_autoClose) && _autoClose > 0) {
        registerTimeoutForAutoClose(() => {
          close(event);
        }, _autoClose);
      }
    }, delay);
  };

  const onClose = (event?: Event, delay = unref(hideAfter)) => {
    cancelTimeoutForAutoClose();
    registerTimeout(() => {
      close(event);
    }, delay);
  };

  return {
    onOpen,
    onClose,
  };
}
