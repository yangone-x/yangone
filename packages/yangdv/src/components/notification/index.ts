import { CreateNotification } from './notification';
export { default as Notification } from './notification.vue';
export type {
  NotificationPlacement,
  NotificationProps,
  NotificationType,
} from './type.d';

const notification = new CreateNotification();
export function useNotification() {
  return {
    notification: notification.notification.bind(notification),
  };
}
