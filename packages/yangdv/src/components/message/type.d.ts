import type { VNode } from 'vue';

import type MessageConstructor from './message.vue';

export type MessageType = 'error' | 'info' | 'loading' | 'success' | 'warning';

export type MessagePlacement =
  | 'bottom-center'
  | 'bottom-left'
  | 'bottom-right'
  | 'top-center'
  | 'top-left'
  | 'top-right';

export interface MessageProps {
  /**
   *  message 文本
   */
  content?: (() => VNode) | string | VNode;
  /**
   * 是否将 `message` 视为 HTML 字符串
   * @default false
   */
  dangerouslyUseHTMLString?: boolean;
  /**
   * 显示时长，毫秒。设置为 0 则不会自动关闭
   * @default 3000
   */
  duration?: number;
  /**
   * 合并内容相同的消息，不支持 VNode 消息类型
   * @default false
   */
  grouping?: boolean;
  /**
   * message 唯一标识
   */
  id?: string;
  /**
   * 设置到视口顶部的距离
   * @default 16
   */
  offset?: number;
  /**
   * 在关闭时以消息实例作为参数的回调函数
   */
  onClose?: () => void;
  /**
   * message 放置位置
   * @default 'top-center'
   */
  placement?: MessagePlacement;
  /**
   * 是否无样式
   * @default true
   */
  plain?: boolean;
  /**
   * 重复次数，类似于徽章，在与 `grouping` 一起使用时用作初始数量
   * @default 1
   */
  repeatNum?: number;
  /**
   * 是否显示关闭按钮
   * @default false
   */
  showClose?: boolean;
  /**
   * message 类型
   * @default 'info'
   */
  type?: MessageType;
}

export type MessageInstance = InstanceType<typeof MessageConstructor> & unknown;
export type MessageOptions = Partial<
  Omit<MessageProps, 'id'> & {
    appendTo?: HTMLElement | string;
  }
>;
export type MessageParams = MessageOptions | MessageOptions['content'];
export type MessageParamsNormalized = Omit<MessageProps, 'id'> & {
  /**
   * @description set the root element for the message, default to `document.body`
   */
  appendTo: HTMLElement;
};
export interface MessageHandler {
  /**
   * close the Message
   */
  close: () => void;
}
export type MessageFn = {
  (options?: MessageParams, appContext?: AppContext | null): MessageHandler;
  closeAll(type?: MessageType): void;
  closeAllByPlacement(position: MessagePlacement): void;
};

export type ComponentsMap = Partial<Record<MessageType, any>>;
