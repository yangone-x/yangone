import { Notification } from './notification';
const notification = new Notification();
export function useNotification() {
  return {
    notification: notification.notification.bind(notification),
  };
}
