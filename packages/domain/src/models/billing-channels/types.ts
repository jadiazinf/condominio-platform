import { z } from 'zod'
import {
  billingChannelSchema,
  EChannelTypes,
  EBillingFrequencies,
  EGenerationStrategies,
  EFeeTypes,
  EAllocationStrategies,
  EBillingInterestTypes,
  EInterestCapTypes,
} from './schema'

export type TBillingChannel = z.infer<typeof billingChannelSchema>
export type TChannelType = (typeof EChannelTypes)[number]
export type TBillingFrequency = (typeof EBillingFrequencies)[number]
export type TGenerationStrategy = (typeof EGenerationStrategies)[number]
export type TFeeType = (typeof EFeeTypes)[number]
export type TAllocationStrategy = (typeof EAllocationStrategies)[number]
export type TBillingInterestType = (typeof EBillingInterestTypes)[number]
export type TInterestCapType = (typeof EInterestCapTypes)[number]
