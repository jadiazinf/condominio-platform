import { paymentApplicationSchema } from '../schema'

export const paymentApplicationCreateSchema = paymentApplicationSchema.omit({
  id: true,
  appliedAt: true,
  payment: true,
  quota: true,
})
