import type { VNode } from 'vue';

import type NotificationConstructor from './notification.vue';

export type NotificationType = 'error' | 'info' | 'success' | 'warning';

export type NotificationPlacement =
  | 'bottom-left'
  | 'bottom-right'
  | 'top-left'
  | 'top-right';

export interface NotificationProps {
  /**
   *  notification 文本
   */
  content?: (() => VNode) | string | VNode;
  /**
   * 是否将 `notification` 视为 HTML 字符串
   * @default false
   */
  dangerouslyUseHTMLString?: boolean;
  /**
   * 显示时长，毫秒。设置为 0 则不会自动关闭
   * @default 3000
   */
  duration?: number;
  /**
   * notification 唯一标识
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
   * notification 放置位置
   * @default 'top-right'
   */
  placement?: NotificationPlacement;
  /**
   * 是否显示关闭按钮
   * @default false
   */
  showClose?: boolean;
  /**
   * notification 标题
   */
  title?: string;
  /**
   * notification 类型
   * @default 'info'
   */
  type?: NotificationType;
}

export type NotificationInstance = InstanceType<
  typeof NotificationConstructor
> &
  unknown;
export type NotificationOptions = Partial<
  Omit<NotificationProps, 'id'> & {
    appendTo?: HTMLElement | string;
  }
>;
export type NotificationParams =
  | NotificationOptions
  | NotificationOptions['content'];
export type NotificationParamsNormalized = Omit<NotificationProps, 'id'> & {
  /**
   * @description set the root element for the notification, default to `document.body`
   */
  appendTo: HTMLElement;
};
export interface NotificationHandler {
  /**
   * close the Notification
   */
  close: () => void;
}
export type NotificationFn = {
  (
    options?: NotificationParams,
    appContext?: AppContext | null,
  ): NotificationHandler;
  closeAll(type?: NotificationType): void;
  closeAllByPlacement(position: NotificationPlacement): void;
};

export type ComponentsMap = Partial<Record<NotificationType, any>>;
