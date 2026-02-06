import { z } from 'zod'
import { subscriptionTermsConditionsSchema } from './schema'

export type TSubscriptionTermsConditions = z.infer<typeof subscriptionTermsConditionsSchema>
