/**
 * 组合事件处理器，将用户提供的事件处理器与默认事件处理器进行组合
 * @param theirsHandler - 用户提供的事件处理器，返回boolean值表示是否阻止默认行为
 * @param oursHandler - 默认的事件处理器
 * @param options - 配置选项
 * @param options.checkForDefaultPrevented - 是否检查默认行为是否被阻止，默认为true
 * @returns 组合后的事件处理器函数
 */
export function composeEventHandlers<E>(
  theirsHandler?: (event: E) => boolean | undefined,
  oursHandler?: (event: E) => void,
  { checkForDefaultPrevented = true } = {},
) {
  // 根据用户处理器的返回值决定是否执行默认处理器
  const handleEvent = (event: E) => {
    const shouldPrevent = theirsHandler?.(event);

    if (checkForDefaultPrevented === false || !shouldPrevent) {
      return oursHandler?.(event);
    }
  };
  return handleEvent;
}
