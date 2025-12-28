import { z } from 'zod'
import { EInterestTypes, ECalculationPeriods, interestConfigurationSchema } from './schema'

export type TInterestType = (typeof EInterestTypes)[number]
export type TCalculationPeriod = (typeof ECalculationPeriods)[number]

export type TInterestConfiguration = z.infer<typeof interestConfigurationSchema>
