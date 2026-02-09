import { z } from 'zod'
import { amenityReservationCreateSchema } from './createDto'
import { amenityReservationUpdateSchema } from './updateDto'

export type TAmenityReservationCreate = z.infer<typeof amenityReservationCreateSchema>
export type TAmenityReservationUpdate = z.infer<typeof amenityReservationUpdateSchema>
