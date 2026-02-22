import { z } from 'zod'
import {
  EConceptTypes,
  ERecurrencePeriods,
  EChargeAdjustmentTypes,
  EAssignmentScopes,
  EDistributionMethods,
  paymentConceptSchema,
  paymentConceptAssignmentSchema,
  paymentConceptAssignmentCreateSchema,
  paymentConceptAssignmentUpdateSchema,
  paymentConceptBankAccountSchema,
  paymentConceptBankAccountCreateSchema,
} from './schema'

export type TConceptType = (typeof EConceptTypes)[number]
export type TRecurrencePeriod = (typeof ERecurrencePeriods)[number]
export type TChargeAdjustmentType = (typeof EChargeAdjustmentTypes)[number]
export type TAssignmentScope = (typeof EAssignmentScopes)[number]
export type TDistributionMethod = (typeof EDistributionMethods)[number]

export type TPaymentConcept = z.infer<typeof paymentConceptSchema>
export type TPaymentConceptAssignment = z.infer<typeof paymentConceptAssignmentSchema>
export type TPaymentConceptAssignmentCreate = z.infer<typeof paymentConceptAssignmentCreateSchema>
export type TPaymentConceptAssignmentUpdate = z.infer<typeof paymentConceptAssignmentUpdateSchema>
export type TPaymentConceptBankAccount = z.infer<typeof paymentConceptBankAccountSchema>
export type TPaymentConceptBankAccountCreate = z.infer<typeof paymentConceptBankAccountCreateSchema>
