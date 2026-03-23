import { z } from 'zod'
import { timestampField } from '../../shared/base-model.schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.eventLogs

export const EEventLogCategories = [
  'payment',
  'quota',
  'reconciliation',
  'worker',
  'notification',
  'gateway',
  'auth',
  'subscription',
  'receipt',
  'system',
] as const

export const EEventLogLevels = ['info', 'warn', 'error', 'critical'] as const

export const EEventLogResults = ['success', 'failure', 'partial'] as const

export const EEventLogSources = ['api', 'worker', 'webhook', 'cron', 'system'] as const

export const eventLogSchema = z.object({
  id: z.uuid(),
  category: z.enum(EEventLogCategories, { error: d.category.invalid }),
  level: z.enum(EEventLogLevels, { error: d.level.invalid }),
  event: z.string({ error: d.event.required }).max(200, { error: d.event.max }),
  action: z.string({ error: d.action.required }).max(200, { error: d.action.max }),
  message: z.string({ error: d.message.required }),
  module: z.string().max(100).nullable().optional(),
  condominiumId: z.uuid().nullable().optional(),
  entityType: z.string().max(100).nullable().optional(),
  entityId: z.uuid().nullable().optional(),
  userId: z.uuid().nullable().optional(),
  userRole: z.string().max(50).nullable().optional(),
  result: z.enum(EEventLogResults, { error: d.result.invalid }),
  errorCode: z.string().max(50).nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  durationMs: z.number().int().nullable().optional(),
  source: z.enum(EEventLogSources, { error: d.source.invalid }).default('api'),
  ipAddress: z.string().nullable().optional(),
  createdAt: timestampField,
})
