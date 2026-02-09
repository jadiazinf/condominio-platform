import { amenityReservationSchema } from '../schema'

export const amenityReservationCreateSchema = amenityReservationSchema.omit({
  id: true,
  status: true,
  rejectionReason: true,
  approvedBy: true,
  approvedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
})
