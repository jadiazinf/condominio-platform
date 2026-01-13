/**
 * Audit & Health Endpoints Types
 *
 * Type definitions for audit and health API endpoints:
 * - Audit Logs
 * - Health Check
 */

import type { TAuditLog, TAuditLogCreate, TAuditAction } from '@packages/domain'
import type { TEndpointDefinition, TIdParam } from './base'
import type { TApiDataResponse } from '../api-responses'

// =============================================================================
// Audit Logs Endpoints
// =============================================================================

type TTableNameParam = { tableName: string }
type TRecordIdParam = { recordId: string }
type TTableAndRecordParam = { tableName: string; recordId: string }
type TUserIdParam = { userId: string }
type TActionParam = { action: TAuditAction }
type TDateRangeQuery = { startDate: string; endDate: string }

/** GET /audit-logs - List all */
export type TAuditLogsListEndpoint = TEndpointDefinition<
  'GET',
  '/audit-logs',
  TApiDataResponse<TAuditLog[]>
>

/** GET /audit-logs/table/:tableName - Get by table */
export type TAuditLogsGetByTableEndpoint = TEndpointDefinition<
  'GET',
  '/audit-logs/table/:tableName',
  TApiDataResponse<TAuditLog[]>,
  void,
  TTableNameParam
>

/** GET /audit-logs/record/:recordId - Get by record */
export type TAuditLogsGetByRecordEndpoint = TEndpointDefinition<
  'GET',
  '/audit-logs/record/:recordId',
  TApiDataResponse<TAuditLog[]>,
  void,
  TRecordIdParam
>

/** GET /audit-logs/table/:tableName/record/:recordId - Get by table and record */
export type TAuditLogsGetByTableAndRecordEndpoint = TEndpointDefinition<
  'GET',
  '/audit-logs/table/:tableName/record/:recordId',
  TApiDataResponse<TAuditLog[]>,
  void,
  TTableAndRecordParam
>

/** GET /audit-logs/user/:userId - Get by user */
export type TAuditLogsGetByUserEndpoint = TEndpointDefinition<
  'GET',
  '/audit-logs/user/:userId',
  TApiDataResponse<TAuditLog[]>,
  void,
  TUserIdParam
>

/** GET /audit-logs/action/:action - Get by action */
export type TAuditLogsGetByActionEndpoint = TEndpointDefinition<
  'GET',
  '/audit-logs/action/:action',
  TApiDataResponse<TAuditLog[]>,
  void,
  TActionParam
>

/** GET /audit-logs/date-range - Get by date range */
export type TAuditLogsGetByDateRangeEndpoint = TEndpointDefinition<
  'GET',
  '/audit-logs/date-range',
  TApiDataResponse<TAuditLog[]>,
  void,
  void,
  TDateRangeQuery
>

/** GET /audit-logs/:id - Get by ID */
export type TAuditLogsGetByIdEndpoint = TEndpointDefinition<
  'GET',
  '/audit-logs/:id',
  TApiDataResponse<TAuditLog>,
  void,
  TIdParam
>

/** POST /audit-logs - Create */
export type TAuditLogsCreateEndpoint = TEndpointDefinition<
  'POST',
  '/audit-logs',
  TApiDataResponse<TAuditLog>,
  TAuditLogCreate
>

export type TAuditLogsEndpoints = {
  list: TAuditLogsListEndpoint
  getByTable: TAuditLogsGetByTableEndpoint
  getByRecord: TAuditLogsGetByRecordEndpoint
  getByTableAndRecord: TAuditLogsGetByTableAndRecordEndpoint
  getByUser: TAuditLogsGetByUserEndpoint
  getByAction: TAuditLogsGetByActionEndpoint
  getByDateRange: TAuditLogsGetByDateRangeEndpoint
  getById: TAuditLogsGetByIdEndpoint
  create: TAuditLogsCreateEndpoint
}

// =============================================================================
// Health Check Endpoints
// =============================================================================

type THealthCheckData = {
  status: 'ok'
  timestamp: string
  uptime: number
}

/** GET /health - Health check */
export type THealthCheckEndpoint = TEndpointDefinition<'GET', '/health', THealthCheckData>

export type THealthEndpoints = {
  check: THealthCheckEndpoint
}
