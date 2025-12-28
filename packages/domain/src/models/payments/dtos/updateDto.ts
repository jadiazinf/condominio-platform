import { paymentCreateSchema } from './createDto'

export const paymentUpdateSchema = paymentCreateSchema.partial()
