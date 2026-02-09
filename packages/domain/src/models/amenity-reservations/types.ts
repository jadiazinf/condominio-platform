import { z } from 'zod'
import { EReservationStatuses, amenityReservationSchema } from './schema'

export type TReservationStatus = (typeof EReservationStatuses)[number]

export type TAmenityReservation = z.infer<typeof amenityReservationSchema>
