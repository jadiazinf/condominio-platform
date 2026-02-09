import { z } from 'zod'
import { baseModelSchema, timestampField } from '../../shared/base-model.schema'

export const EReservationStatuses = ['pending', 'approved', 'rejected', 'cancelled'] as const

export const amenityReservationSchema = baseModelSchema.extend({
  amenityId: z.uuid('Invalid amenity ID'),
  userId: z.uuid('Invalid user ID'),
  startTime: timestampField,
  endTime: timestampField,
  status: z.enum(EReservationStatuses).default('pending'),
  notes: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  approvedBy: z.uuid().nullable(),
  approvedAt: timestampField.nullable(),
  cancelledAt: timestampField.nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
})
