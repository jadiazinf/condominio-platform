/**
 * Notifications Endpoints Types
 *
 * Type definitions for all notification-related API endpoints:
 * - Notifications
 * - Notification Templates
 * - User Notification Preferences
 * - User FCM Tokens
 */

import type {
  TNotification,
  TNotificationCreate,
  TNotificationUpdate,
  TNotificationCategory,
  TPriority,
  TNotificationChannel,
  TNotificationTemplate,
  TNotificationTemplateCreate,
  TNotificationTemplateUpdate,
  TUserNotificationPreference,
  TUserNotificationPreferenceCreate,
  TUserNotificationPreferenceUpdate,
  TUserFcmToken,
  TUserFcmTokenCreate,
  TUserFcmTokenUpdate,
} from '@packages/domain'
import { EDevicePlatforms } from '@packages/domain'
import type { TEndpointDefinition, TIdParam, TCodeParam } from './base'
import type { TApiDataResponse } from '../api-responses'

// =============================================================================
// Notifications Endpoints
// =============================================================================

type TUserIdParam = { userId: string }

// Send notification body
type TSendNotificationBody = {
  userId: string
  category: TNotificationCategory
  title: string
  body: string
  priority?: TPriority
  data?: Record<string, unknown>
  channels?: TNotificationChannel[]
  expiresAt?: string
}

// Unread count response
type TUnreadCountData = { count: number }

// Mark all as read response
type TMarkAllAsReadData = { count: number }

/** GET /notifications - List all */
export type TNotificationsListEndpoint = TEndpointDefinition<
  'GET',
  '/notifications',
  TApiDataResponse<TNotification[]>
>

/** GET /notifications/user/:userId - Get by user */
export type TNotificationsGetByUserEndpoint = TEndpointDefinition<
  'GET',
  '/notifications/user/:userId',
  TApiDataResponse<TNotification[]>,
  void,
  TUserIdParam
>

/** GET /notifications/user/:userId/unread-count - Get unread count */
export type TNotificationsGetUnreadCountEndpoint = TEndpointDefinition<
  'GET',
  '/notifications/user/:userId/unread-count',
  TApiDataResponse<TUnreadCountData>,
  void,
  TUserIdParam
>

/** GET /notifications/:id - Get by ID */
export type TNotificationsGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/notifications/:id',
  TApiDataResponse<TNotification>,
  void,
  TIdParam
>

/** POST /notifications/send - Send notification */
export type TNotificationsSendEndpoint = TEndpointDefinition<
  'POST',
  '/notifications/send',
  TApiDataResponse<TNotification>,
  TSendNotificationBody
>

/** POST /notifications - Create */
export type TNotificationsCreateEndpoint = TEndpointDefinition<
  'POST',
  '/notifications',
  TApiDataResponse<TNotification>,
  TNotificationCreate
>

/** POST /notifications/:id/read - Mark as read */
export type TNotificationsMarkAsReadEndpoint = TEndpointDefinition<
  'POST',
  '/notifications/:id/read',
  TApiDataResponse<TNotification>,
  void,
  TIdParam
>

/** POST /notifications/user/:userId/read-all - Mark all as read */
export type TNotificationsMarkAllAsReadEndpoint = TEndpointDefinition<
  'POST',
  '/notifications/user/:userId/read-all',
  TApiDataResponse<TMarkAllAsReadData>,
  void,
  TUserIdParam
>

/** PATCH /notifications/:id - Update */
export type TNotificationsUpdateEndpoint = TEndpointDefinition<
  'PATCH',
  '/notifications/:id',
  TApiDataResponse<TNotification>,
  TNotificationUpdate,
  TIdParam
>

/** DELETE /notifications/:id - Delete */
export type TNotificationsDeleteEndpoint = TEndpointDefinition<
  'DELETE',
  '/notifications/:id',
  void,
  void,
  TIdParam
>

export type TNotificationsEndpoints = {
  list: TNotificationsListEndpoint
  getByUser: TNotificationsGetByUserEndpoint
  getUnreadCount: TNotificationsGetUnreadCountEndpoint
  getById: TNotificationsGetByIdEndpoint
  send: TNotificationsSendEndpoint
  create: TNotificationsCreateEndpoint
  markAsRead: TNotificationsMarkAsReadEndpoint
  markAllAsRead: TNotificationsMarkAllAsReadEndpoint
  update: TNotificationsUpdateEndpoint
  delete: TNotificationsDeleteEndpoint
}

// =============================================================================
// Notification Templates Endpoints
// =============================================================================

// Render body
type TRenderTemplateBody = { variables: Record<string, string> }

// Render response
type TRenderedTemplateData = {
  title: string
  body: string
}

/** GET /notification-templates - List all */
export type TNotificationTemplatesListEndpoint = TEndpointDefinition<
  'GET',
  '/notification-templates',
  TApiDataResponse<TNotificationTemplate[]>
>

/** GET /notification-templates/code/:code - Get by code */
export type TNotificationTemplatesGetByCodeEndpoint = TEndpointDefinition<
  'GET',
  '/notification-templates/code/:code',
  TApiDataResponse<TNotificationTemplate>,
  void,
  TCodeParam
>

/** GET /notification-templates/:id - Get by ID */
export type TNotificationTemplatesGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/notification-templates/:id',
  TApiDataResponse<TNotificationTemplate>,
  void,
  TIdParam
>

/** POST /notification-templates - Create */
export type TNotificationTemplatesCreateEndpoint = TEndpointDefinition<
  'POST',
  '/notification-templates',
  TApiDataResponse<TNotificationTemplate>,
  TNotificationTemplateCreate
>

/** POST /notification-templates/code/:code/render - Render template */
export type TNotificationTemplatesRenderEndpoint = TEndpointDefinition<
  'POST',
  '/notification-templates/code/:code/render',
  TApiDataResponse<TRenderedTemplateData>,
  TRenderTemplateBody,
  TCodeParam
>

/** PATCH /notification-templates/:id - Update */
export type TNotificationTemplatesUpdateEndpoint = TEndpointDefinition<
  'PATCH',
  '/notification-templates/:id',
  TApiDataResponse<TNotificationTemplate>,
  TNotificationTemplateUpdate,
  TIdParam
>

/** DELETE /notification-templates/:id - Delete */
export type TNotificationTemplatesDeleteEndpoint = TEndpointDefinition<
  'DELETE',
  '/notification-templates/:id',
  void,
  void,
  TIdParam
>

export type TNotificationTemplatesEndpoints = {
  list: TNotificationTemplatesListEndpoint
  getByCode: TNotificationTemplatesGetByCodeEndpoint
  getById: TNotificationTemplatesGetByIdEndpoint
  create: TNotificationTemplatesCreateEndpoint
  render: TNotificationTemplatesRenderEndpoint
  update: TNotificationTemplatesUpdateEndpoint
  delete: TNotificationTemplatesDeleteEndpoint
}

// =============================================================================
// User Notification Preferences Endpoints
// =============================================================================

// Update preference body
type TUpdatePreferenceBody = {
  category: TNotificationCategory
  channel: TNotificationChannel
  isEnabled?: boolean
  quietHoursStart?: string | null
  quietHoursEnd?: string | null
}

/** GET /user-notification-preferences - List all */
export type TUserNotificationPreferencesListEndpoint = TEndpointDefinition<
  'GET',
  '/user-notification-preferences',
  TApiDataResponse<TUserNotificationPreference[]>
>

/** GET /user-notification-preferences/user/:userId - Get by user */
export type TUserNotificationPreferencesGetByUserEndpoint = TEndpointDefinition<
  'GET',
  '/user-notification-preferences/user/:userId',
  TApiDataResponse<TUserNotificationPreference[]>,
  void,
  TUserIdParam
>

/** GET /user-notification-preferences/:id - Get by ID */
export type TUserNotificationPreferencesGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/user-notification-preferences/:id',
  TApiDataResponse<TUserNotificationPreference>,
  void,
  TIdParam
>

/** POST /user-notification-preferences - Create */
export type TUserNotificationPreferencesCreateEndpoint = TEndpointDefinition<
  'POST',
  '/user-notification-preferences',
  TApiDataResponse<TUserNotificationPreference>,
  TUserNotificationPreferenceCreate
>

/** POST /user-notification-preferences/user/:userId/initialize - Initialize for user */
export type TUserNotificationPreferencesInitializeEndpoint = TEndpointDefinition<
  'POST',
  '/user-notification-preferences/user/:userId/initialize',
  TApiDataResponse<TUserNotificationPreference[]>,
  void,
  TUserIdParam
>

/** PUT /user-notification-preferences/user/:userId - Update for user */
export type TUserNotificationPreferencesUpdateForUserEndpoint = TEndpointDefinition<
  'PUT',
  '/user-notification-preferences/user/:userId',
  TApiDataResponse<TUserNotificationPreference>,
  TUpdatePreferenceBody,
  TUserIdParam
>

/** PATCH /user-notification-preferences/:id - Update by ID */
export type TUserNotificationPreferencesUpdateEndpoint = TEndpointDefinition<
  'PATCH',
  '/user-notification-preferences/:id',
  TApiDataResponse<TUserNotificationPreference>,
  TUserNotificationPreferenceUpdate,
  TIdParam
>

/** DELETE /user-notification-preferences/:id - Delete */
export type TUserNotificationPreferencesDeleteEndpoint = TEndpointDefinition<
  'DELETE',
  '/user-notification-preferences/:id',
  void,
  void,
  TIdParam
>

export type TUserNotificationPreferencesEndpoints = {
  list: TUserNotificationPreferencesListEndpoint
  getByUser: TUserNotificationPreferencesGetByUserEndpoint
  getById: TUserNotificationPreferencesGetByIdEndpoint
  create: TUserNotificationPreferencesCreateEndpoint
  initialize: TUserNotificationPreferencesInitializeEndpoint
  updateForUser: TUserNotificationPreferencesUpdateForUserEndpoint
  update: TUserNotificationPreferencesUpdateEndpoint
  delete: TUserNotificationPreferencesDeleteEndpoint
}

// =============================================================================
// User FCM Tokens Endpoints
// =============================================================================

// Platform type derived from EDevicePlatforms
type TDevicePlatform = (typeof EDevicePlatforms)[number]

// Register token body
type TRegisterTokenBody = {
  token: string
  platform: TDevicePlatform
  deviceName?: string | null
}

// Unregister token body
type TUnregisterTokenBody = {
  token: string
}

// Register token response
type TRegisterTokenData = TUserFcmToken & { isNew?: boolean }

// Unregister token response
type TUnregisterTokenData = { deleted: boolean }

/** GET /user-fcm-tokens/user/:userId - Get by user */
export type TUserFcmTokensGetByUserEndpoint = TEndpointDefinition<
  'GET',
  '/user-fcm-tokens/user/:userId',
  TApiDataResponse<TUserFcmToken[]>,
  void,
  TUserIdParam
>

/** POST /user-fcm-tokens/user/:userId/register - Register token */
export type TUserFcmTokensRegisterEndpoint = TEndpointDefinition<
  'POST',
  '/user-fcm-tokens/user/:userId/register',
  TApiDataResponse<TRegisterTokenData>,
  TRegisterTokenBody,
  TUserIdParam
>

/** POST /user-fcm-tokens/user/:userId/unregister - Unregister token */
export type TUserFcmTokensUnregisterEndpoint = TEndpointDefinition<
  'POST',
  '/user-fcm-tokens/user/:userId/unregister',
  TApiDataResponse<TUnregisterTokenData>,
  TUnregisterTokenBody,
  TUserIdParam
>

/** DELETE /user-fcm-tokens/:id - Delete */
export type TUserFcmTokensDeleteEndpoint = TEndpointDefinition<
  'DELETE',
  '/user-fcm-tokens/:id',
  void,
  void,
  TIdParam
>

export type TUserFcmTokensEndpoints = {
  getByUser: TUserFcmTokensGetByUserEndpoint
  register: TUserFcmTokensRegisterEndpoint
  unregister: TUserFcmTokensUnregisterEndpoint
  delete: TUserFcmTokensDeleteEndpoint
}
