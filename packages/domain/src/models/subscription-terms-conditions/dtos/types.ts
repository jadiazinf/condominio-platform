import { z } from 'zod'
import { subscriptionTermsConditionsCreateSchema } from './createDto'
import { subscriptionTermsConditionsUpdateSchema } from './updateDto'

export type TSubscriptionTermsConditionsCreate = z.infer<typeof subscriptionTermsConditionsCreateSchema>
export type TSubscriptionTermsConditionsUpdate = z.infer<typeof subscriptionTermsConditionsUpdateSchema>
