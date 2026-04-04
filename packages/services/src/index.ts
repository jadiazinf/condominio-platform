// Firebase
export {
  admin,
  initializeFirebaseAdmin,
  isFirebaseInitialized,
  type IFirebaseConfig,
} from './firebase/config'

// Base
export { type IService, type TServiceResult, type TErrorCode, success, failure } from './base'

// Event Logger
export { EventLogger, type IEventLogRepository, type IEventLogInput } from './event-logger'

// Notification services
export {
  SendFcmNotificationService,
  type ISendFcmNotificationInput,
  type ISendFcmMulticastInput,
  type ISendFcmNotificationOutput,
} from './notifications/send-fcm-notification.service'

export {
  SendNotificationService,
  type ISendNotificationInput,
  type ISendNotificationOutput,
  type TNotificationHook,
} from './notifications/send-notification.service'
