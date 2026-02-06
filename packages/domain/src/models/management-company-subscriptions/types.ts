import { z } from 'zod'
import {
  managementCompanySubscriptionSchema,
  ESubscriptionStatus,
  EBillingCycle,
  EDiscountType,
} from './schema'

export type TSubscriptionStatus = (typeof ESubscriptionStatus)[number]
export type TBillingCycle = (typeof EBillingCycle)[number]
export type TDiscountType = (typeof EDiscountType)[number]
export type TManagementCompanySubscription = z.infer<typeof managementCompanySubscriptionSchema>
