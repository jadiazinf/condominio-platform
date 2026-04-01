import { z } from 'zod'
import { dateField } from '../../shared/base-model.schema'

export const ownershipTransferSnapshotSchema = z.object({
  id: z.uuid(),
  unitId: z.uuid(),
  previousOwnerId: z.uuid(),
  newOwnerId: z.uuid(),
  transferDate: dateField,
  balanceSnapshot: z.record(z.string(), z.unknown()),
  totalDebt: z.string().default('0'),
  debtCurrencyId: z.uuid().nullable(),
  notes: z.string().nullable(),
  createdBy: z.uuid().nullable(),
  createdAt: z.coerce.date(),
})
