import { z } from 'zod'
import { baseModelSchema, timestampField } from '../../shared/base-model.schema'
import { EGatewayTypes } from '../payment-gateways/schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.gatewayTransactions

/**
 * Gateway transaction lifecycle statuses:
 *
 * - `initiated`  — Transaction created, awaiting external gateway response.
 * - `processing` — Gateway acknowledged receipt, processing asynchronously.
 *                   Used for async bank flows where confirmation comes via webhook.
 *                   The `attempts`, `maxAttempts`, and `lastAttemptAt` fields support
 *                   a retry mechanism: a background worker can call
 *                   `getPendingVerification()` to find initiated/processing transactions
 *                   that haven't exceeded maxAttempts, then call `getTransactionStatus()`
 *                   on the adapter to poll the gateway.
 * - `completed`  — Gateway confirmed the transaction successfully.
 * - `failed`     — Transaction failed (check `errorMessage` for details).
 * - `refunded`   — Transaction was refunded through the gateway.
 */
export const EGatewayTransactionStatuses = [
  'initiated',
  'processing',
  'completed',
  'failed',
  'refunded',
] as const

export const gatewayTransactionSchema = baseModelSchema.extend({
  paymentId: z.uuid({ error: d.paymentId.invalid }),
  gatewayType: z.enum(EGatewayTypes, { error: d.gatewayType.invalid }),
  externalTransactionId: z.string().max(255).nullable(),
  externalReference: z.string().max(255).nullable(),
  requestPayload: z.record(z.string(), z.unknown()).nullable(),
  responsePayload: z.record(z.string(), z.unknown()).nullable(),
  status: z.enum(EGatewayTransactionStatuses).default('initiated'),
  attempts: z.number().int().min(0).default(0),
  maxAttempts: z.number().int().min(1).default(10),
  lastAttemptAt: timestampField.nullable(),
  verifiedAt: timestampField.nullable(),
  errorMessage: z.string().nullable(),
})
