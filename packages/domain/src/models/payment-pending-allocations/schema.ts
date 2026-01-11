import { z } from 'zod'
import { timestampField } from '../../shared/base-model.schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.paymentPendingAllocations

export const EAllocationStatuses = ['pending', 'allocated', 'refunded'] as const

export const paymentPendingAllocationSchema = z.object({
  id: z.uuid(),
  paymentId: z.uuid({ error: d.paymentId.invalid }),
  pendingAmount: z.string({ error: d.pendingAmount.required }),
  currencyId: z.uuid({ error: d.currencyId.invalid }),
  status: z.enum(EAllocationStatuses, { error: d.status.invalid }).default('pending'),
  resolutionType: z.string().max(50, { error: d.resolutionType.max }).nullish(),
  resolutionNotes: z.string().nullish(),
  allocatedToQuotaId: z.uuid({ error: d.allocatedToQuotaId.invalid }).nullish(),
  createdAt: timestampField,
  allocatedBy: z.uuid({ error: d.allocatedBy.invalid }).nullish(),
  allocatedAt: timestampField.nullish(),
})
