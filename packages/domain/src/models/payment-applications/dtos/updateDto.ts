import { paymentApplicationCreateSchema } from './createDto'

export const paymentApplicationUpdateSchema = paymentApplicationCreateSchema.partial()
