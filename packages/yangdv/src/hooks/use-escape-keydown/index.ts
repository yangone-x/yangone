import { onBeforeUnmount, onMounted } from 'vue';

import { isClient } from '../../utils';

let registeredEscapeHandlers: ((e: KeyboardEvent) => void)[] = [];

/**
 * 缓存的键盘事件处理器
 * 处理Escape键的按下事件，执行所有已注册的Escape处理器
 *
 * @param event - 键盘事件对象
 * @returns 无返回值
 */
function cachedHandler(event: KeyboardEvent) {
  const code = event.code;
  // 处理Escape键按下事件，执行所有已注册的处理器
  if (code === 'Escape') {
    registeredEscapeHandlers.forEach((registeredHandler) =>
      registeredHandler(event),
    );
  }
}

/**
 * 监听ESC键按下事件的Vue Composition API函数
 * 该函数实现了全局ESC键事件的统一管理，避免重复绑定事件监听器
 *
 * @param handler - ESC键按下时触发的回调函数，接收KeyboardEvent对象作为参数
 * @returns 无返回值
 */
export function useEscapeKeydown(handler: (e: KeyboardEvent) => void) {
  // 组件挂载时注册ESC键处理函数
  onMounted(() => {
    // 如果当前没有已注册的ESC键处理函数，则添加全局键盘事件监听器
    if (registeredEscapeHandlers.length === 0) {
      document.addEventListener('keydown', cachedHandler);
    }
    // 在客户端环境下将处理函数添加到注册列表中
    if (isClient) registeredEscapeHandlers.push(handler);
  });

  // 组件卸载前清理ESC键处理函数
  onBeforeUnmount(() => {
    // 从注册列表中移除当前处理函数
    registeredEscapeHandlers = registeredEscapeHandlers.filter(
      (registeredHandler) => registeredHandler !== handler,
    );
    // 如果所有ESC键处理函数都已被移除，则移除全局键盘事件监听器
    if (registeredEscapeHandlers.length === 0 && isClient)
      document.removeEventListener('keydown', cachedHandler);
  });
}
