import type { TeleportProps } from 'vue';

type DoneFn = (cancel?: boolean) => void;

export type ModalBeforeCloseFn = (done: DoneFn) => void;

export interface ModalProps {
  /**
   * Modal 添加到哪个元素
   * @default 'body''
   */
  appendTo?: TeleportProps['to'];
  /**
   * 是否将 Modal 本身附加到 body。嵌套的 Modal 应该将此属性设置为 `true`
   * @default true
   */
  appendToBody?: boolean;
  /**
   * 在对话框关闭之前的回调，它将阻止对话框关闭，使用 done 来关闭对话框
   */
  beforeClose?: ModalBeforeCloseFn;
  /**
   * 当关闭 Modal 时，销毁其中的元素
   * @default true
   */
  destroyOnClose?: boolean;
  /**
   * 在显示对话框时是否禁用页面滚动
   * @default true
   */
  lockScroll?: boolean;
  /**
   * 是否展示遮罩
   * @default true
   */
  mask?: boolean;
  /**
   * 点击蒙层是否允许关闭
   * @default true
   */
  maskClosable?: boolean;
  /**
   * 弹窗的层级
   */
  zIndex?: number;
}

export interface ModalEmits {
  close: [];
  closed: [];
  open: [];
  opened: [];
}
