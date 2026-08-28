import { Message } from './message';
const message = new Message();
export function useMessage() {
  return {
    message: message.message.bind(message),
    loading: message.loading.bind(message),
  };
}
