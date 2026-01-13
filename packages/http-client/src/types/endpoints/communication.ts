/**
 * Communication Endpoints Types
 *
 * Type definitions for all communication-related API endpoints:
 * - Documents
 * - Messages
 */

import type {
  TDocument,
  TDocumentCreate,
  TDocumentUpdate,
  TMessage,
  TMessageCreate,
  TMessageUpdate,
} from '@packages/domain'
import type { TEndpointDefinition, TIdParam } from './base'
import type { TApiDataResponse } from '../api-responses'

// =============================================================================
// Documents Endpoints
// =============================================================================

type TDocumentTypeParam = { documentType: string }
type TCondominiumIdParam = { condominiumId: string }
type TBuildingIdParam = { buildingId: string }
type TUnitIdParam = { unitId: string }
type TUserIdParam = { userId: string }
type TPaymentIdParam = { paymentId: string }

/** GET /documents - List all */
export type TDocumentsListEndpoint = TEndpointDefinition<
  'GET',
  '/documents',
  TApiDataResponse<TDocument[]>
>

/** GET /documents/public - Get public documents */
export type TDocumentsGetPublicEndpoint = TEndpointDefinition<
  'GET',
  '/documents/public',
  TApiDataResponse<TDocument[]>
>

/** GET /documents/type/:documentType - Get by type */
export type TDocumentsGetByTypeEndpoint = TEndpointDefinition<
  'GET',
  '/documents/type/:documentType',
  TApiDataResponse<TDocument[]>,
  void,
  TDocumentTypeParam
>

/** GET /documents/condominium/:condominiumId - Get by condominium */
export type TDocumentsGetByCondominiumEndpoint = TEndpointDefinition<
  'GET',
  '/documents/condominium/:condominiumId',
  TApiDataResponse<TDocument[]>,
  void,
  TCondominiumIdParam
>

/** GET /documents/building/:buildingId - Get by building */
export type TDocumentsGetByBuildingEndpoint = TEndpointDefinition<
  'GET',
  '/documents/building/:buildingId',
  TApiDataResponse<TDocument[]>,
  void,
  TBuildingIdParam
>

/** GET /documents/unit/:unitId - Get by unit */
export type TDocumentsGetByUnitEndpoint = TEndpointDefinition<
  'GET',
  '/documents/unit/:unitId',
  TApiDataResponse<TDocument[]>,
  void,
  TUnitIdParam
>

/** GET /documents/user/:userId - Get by user */
export type TDocumentsGetByUserEndpoint = TEndpointDefinition<
  'GET',
  '/documents/user/:userId',
  TApiDataResponse<TDocument[]>,
  void,
  TUserIdParam
>

/** GET /documents/payment/:paymentId - Get by payment */
export type TDocumentsGetByPaymentEndpoint = TEndpointDefinition<
  'GET',
  '/documents/payment/:paymentId',
  TApiDataResponse<TDocument[]>,
  void,
  TPaymentIdParam
>

/** GET /documents/:id - Get by ID */
export type TDocumentsGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/documents/:id',
  TApiDataResponse<TDocument>,
  void,
  TIdParam
>

/** POST /documents - Create */
export type TDocumentsCreateEndpoint = TEndpointDefinition<
  'POST',
  '/documents',
  TApiDataResponse<TDocument>,
  TDocumentCreate
>

/** PATCH /documents/:id - Update */
export type TDocumentsUpdateEndpoint = TEndpointDefinition<
  'PATCH',
  '/documents/:id',
  TApiDataResponse<TDocument>,
  TDocumentUpdate,
  TIdParam
>

/** DELETE /documents/:id - Delete */
export type TDocumentsDeleteEndpoint = TEndpointDefinition<
  'DELETE',
  '/documents/:id',
  void,
  void,
  TIdParam
>

export type TDocumentsEndpoints = {
  list: TDocumentsListEndpoint
  getPublic: TDocumentsGetPublicEndpoint
  getByType: TDocumentsGetByTypeEndpoint
  getByCondominium: TDocumentsGetByCondominiumEndpoint
  getByBuilding: TDocumentsGetByBuildingEndpoint
  getByUnit: TDocumentsGetByUnitEndpoint
  getByUser: TDocumentsGetByUserEndpoint
  getByPayment: TDocumentsGetByPaymentEndpoint
  getById: TDocumentsGetByIdEndpoint
  create: TDocumentsCreateEndpoint
  update: TDocumentsUpdateEndpoint
  delete: TDocumentsDeleteEndpoint
}

// =============================================================================
// Messages Endpoints
// =============================================================================

type TSenderIdParam = { senderId: string }
type TRecipientUserIdParam = { recipientUserId: string }
type TMessageTypeParam = { messageType: string }

/** GET /messages - List all */
export type TMessagesListEndpoint = TEndpointDefinition<
  'GET',
  '/messages',
  TApiDataResponse<TMessage[]>
>

/** GET /messages/sender/:senderId - Get by sender */
export type TMessagesGetBySenderEndpoint = TEndpointDefinition<
  'GET',
  '/messages/sender/:senderId',
  TApiDataResponse<TMessage[]>,
  void,
  TSenderIdParam
>

/** GET /messages/recipient/:recipientUserId - Get by recipient */
export type TMessagesGetByRecipientEndpoint = TEndpointDefinition<
  'GET',
  '/messages/recipient/:recipientUserId',
  TApiDataResponse<TMessage[]>,
  void,
  TRecipientUserIdParam
>

/** GET /messages/recipient/:recipientUserId/unread - Get unread */
export type TMessagesGetUnreadEndpoint = TEndpointDefinition<
  'GET',
  '/messages/recipient/:recipientUserId/unread',
  TApiDataResponse<TMessage[]>,
  void,
  TRecipientUserIdParam
>

/** GET /messages/type/:messageType - Get by type */
export type TMessagesGetByTypeEndpoint = TEndpointDefinition<
  'GET',
  '/messages/type/:messageType',
  TApiDataResponse<TMessage[]>,
  void,
  TMessageTypeParam
>

/** GET /messages/condominium/:condominiumId - Get by condominium */
export type TMessagesGetByCondominiumEndpoint = TEndpointDefinition<
  'GET',
  '/messages/condominium/:condominiumId',
  TApiDataResponse<TMessage[]>,
  void,
  TCondominiumIdParam
>

/** GET /messages/:id - Get by ID */
export type TMessagesGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/messages/:id',
  TApiDataResponse<TMessage>,
  void,
  TIdParam
>

/** POST /messages/:id/read - Mark as read */
export type TMessagesMarkAsReadEndpoint = TEndpointDefinition<
  'POST',
  '/messages/:id/read',
  TApiDataResponse<TMessage>,
  void,
  TIdParam
>

/** POST /messages - Create */
export type TMessagesCreateEndpoint = TEndpointDefinition<
  'POST',
  '/messages',
  TApiDataResponse<TMessage>,
  TMessageCreate
>

/** PATCH /messages/:id - Update */
export type TMessagesUpdateEndpoint = TEndpointDefinition<
  'PATCH',
  '/messages/:id',
  TApiDataResponse<TMessage>,
  TMessageUpdate,
  TIdParam
>

/** DELETE /messages/:id - Delete */
export type TMessagesDeleteEndpoint = TEndpointDefinition<
  'DELETE',
  '/messages/:id',
  void,
  void,
  TIdParam
>

export type TMessagesEndpoints = {
  list: TMessagesListEndpoint
  getBySender: TMessagesGetBySenderEndpoint
  getByRecipient: TMessagesGetByRecipientEndpoint
  getUnread: TMessagesGetUnreadEndpoint
  getByType: TMessagesGetByTypeEndpoint
  getByCondominium: TMessagesGetByCondominiumEndpoint
  getById: TMessagesGetByIdEndpoint
  markAsRead: TMessagesMarkAsReadEndpoint
  create: TMessagesCreateEndpoint
  update: TMessagesUpdateEndpoint
  delete: TMessagesDeleteEndpoint
}
