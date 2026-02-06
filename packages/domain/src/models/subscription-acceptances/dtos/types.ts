import { z } from 'zod'
import { subscriptionAcceptanceCreateSchema } from './createDto'

export type TSubscriptionAcceptanceCreate = z.infer<typeof subscriptionAcceptanceCreateSchema>
