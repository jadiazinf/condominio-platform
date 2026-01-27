import { z } from 'zod'
import { managementCompanySubscriptionSchema, ESubscriptionStatus, EBillingCycle } from './schema'

export type TSubscriptionStatus = (typeof ESubscriptionStatus)[number]
export type TBillingCycle = (typeof EBillingCycle)[number]
export type TManagementCompanySubscription = z.infer<typeof managementCompanySubscriptionSchema>
