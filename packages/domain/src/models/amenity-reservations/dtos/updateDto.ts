import { amenityReservationCreateSchema } from './createDto'

export const amenityReservationUpdateSchema = amenityReservationCreateSchema.partial()
