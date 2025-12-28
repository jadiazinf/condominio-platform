import { z } from 'zod'
import { EBankAccountTypes, buildingSchema } from './schema'

export type TBankAccountType = (typeof EBankAccountTypes)[number]

export type TBuilding = z.infer<typeof buildingSchema>
