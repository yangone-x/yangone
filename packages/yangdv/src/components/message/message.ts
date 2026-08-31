import type { AppContext, ComponentInternalInstance } from 'vue';

import type { MessageContext } from './instance';
import type {
  MessageHandler,
  MessageOptions,
  MessageParams,
  MessageParamsNormalized,
  MessagePlacement,
  MessageProps,
  MessageType,
} from './type';

import { createVNode, isVNode, render } from 'vue';

import { isClient, isElement, isFunction, isString } from '../../utils';
import { getOrCreatePlacementInstances, placementInstances } from './instance';
import MessageConstructor from './message.vue';

const MESSAGE_DEFAULT_PLACEMENT = 'top-center';
export const messagePlacementValues: MessagePlacement[] = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];
export const messageTypeValues: MessageType[] = [
  'success',
  'info',
  'warning',
  'error',
];

class CreateMessage {
  defaultOptions: MessageOptions = {
    type: 'info',
  };
  private context: AppContext | null = null;

  private seed = 1;

  constructor(context: AppContext | null = null) {
    this.context = context;
  }
  close(instance: MessageContext) {
    const placement = instance.props.placement || MESSAGE_DEFAULT_PLACEMENT;
    const instances = placementInstances[placement];

    const idx = instances.indexOf(instance);
    if (idx === -1) return;
    instances.splice(idx, 1);
    const { handler } = instance;
    handler.close();
  }

  closeAllByPlacement(placement: MessagePlacement) {
    if (!placementInstances[placement]) return;
    // 创建实例的副本以避免在迭代过程中修改
    const instances = [...placementInstances[placement]];
    instances.forEach((instance) => instance.handler.close());
  }

  closeAllByType(type?: MessageType) {
    for (const placement in placementInstances) {
      if (Object.hasOwn(placementInstances, placement)) {
        // 创建实例的副本以避免在迭代过程中修改
        const instances: MessageContext[] = [
          ...placementInstances[placement as MessagePlacement],
        ];
        for (const instance of instances) {
          if (!type || type === instance.props.type) {
            instance.handler.close();
          }
        }
      }
    }
  }

  /**
   * Loading message
   */
  loading(options: MessageParams = {}) {
    const normalizedOptions = this.normalizeOptions(options);
    return this.message({ ...normalizedOptions, type: 'loading', duration: 0 });
  }

  message(options: MessageParams = {}) {
    if (!isClient) return { close: () => undefined };
    const normalized = this.normalizeOptions(options);
    const instances = getOrCreatePlacementInstances(
      normalized.placement || MESSAGE_DEFAULT_PLACEMENT,
    );

    if (normalized.grouping && instances.length > 0) {
      const instance = instances.find(
        ({ vnode: vm }) => vm.props?.content === normalized.content,
      );
      if (instance) {
        instance.props.repeatNum = (instance.props.repeatNum ?? 1) + 1;
        instance.props.type = normalized.type;
        return instance.handler;
      }
    }

    if (instances.length >= 20) {
      return { close: () => undefined };
    }

    const instance = this.createMessage(normalized);

    instances.push(instance);
    return instance.handler;
  }

  /**
   * Create message
   */
  private createMessage({ appendTo, ...options }: MessageParamsNormalized) {
    const id = `message_${this.seed++}`;
    const userOnClose = options.onClose;
    const container = document.createElement('div');

    const props = {
      ...options,
      id,
      onClose: () => {
        userOnClose?.();
        this.close(instance);
      },
      // 清理消息元素以防止内存泄漏
      onDestroy: () => {
        // 由于元素已被销毁，VNode 也应该被垃圾回收
        // 我们不希望造成任何内存泄漏，因为我们已经将 vm 作为引用返回给用户
        // 因此我们手动将其设置为 false。
        render(null, container);
        container.remove();
      },
    };
    const vnode = createVNode(
      MessageConstructor,
      props,
      isFunction(props.content) || isVNode(props.content)
        ? {
            default: isFunction(props.content)
              ? props.content
              : () => props.content,
          }
        : null,
    );
    vnode.appContext = this.context;
    render(vnode, container);
    // 实例在调用关闭功能时会移除此项目，所以我们不需要担心它。
    appendTo.append(container as Element);
    const vm = vnode.component;

    const handler: MessageHandler = {
      // 与其直接调用 onClose 函数，不如设置这个值，这样我们可以拥有组件的完整生命周期，确保所有关闭步骤都不会被跳过。
      close: () => {
        vm?.exposed?.close();
      },
    };

    const instance: MessageContext = {
      id,
      vnode,
      vm: vm as ComponentInternalInstance,
      handler,
      props: vnode.component?.props as MessageProps,
    };

    return instance;
  }

  /**
   * Normalize appendTo
   */
  private normalizeAppendTo(normalized: MessageOptions) {
    const appendTo = normalized.appendTo;
    if (!appendTo) {
      normalized.appendTo = document.body;
    } else if (isString(normalized.appendTo)) {
      let appendTo = document.querySelector<HTMLElement>(normalized.appendTo);

      // should fallback to default value with a warning
      if (!appendTo || !isElement(appendTo)) {
        console.warn(
          'Message',
          'the appendTo option is not an HTMLElement. Falling back to document.body.',
        );
        appendTo = document.body;
      }
      normalized.appendTo = appendTo;
    }
  }

  /**
   * Normalize options
   */
  private normalizeOptions(params?: MessageParams) {
    const options: MessageOptions =
      !params || isString(params) || isVNode(params) || isFunction(params)
        ? { content: params }
        : params;

    const normalized: MessageOptions = {
      ...this.defaultOptions,
      ...options,
    };
    this.normalizeAppendTo(normalized);
    return normalized as MessageParamsNormalized;
  }
}

export { CreateMessage };
