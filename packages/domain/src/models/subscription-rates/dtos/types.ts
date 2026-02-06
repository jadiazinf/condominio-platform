import { z } from 'zod'
import { subscriptionRateCreateSchema } from './createDto'
import { subscriptionRateUpdateSchema } from './updateDto'

export type TSubscriptionRateCreate = z.infer<typeof subscriptionRateCreateSchema>
export type TSubscriptionRateUpdate = z.infer<typeof subscriptionRateUpdateSchema>
