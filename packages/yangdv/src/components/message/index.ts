import { CreateMessage } from './message';
export { default as Message } from './message.vue';
export type { MessagePlacement, MessageProps, MessageType } from './type.d';

const message = new CreateMessage();
export function useMessage() {
  return {
    message: message.message.bind(message),
    loading: message.loading.bind(message),
  };
}
