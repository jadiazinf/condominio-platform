import { z } from 'zod'
import { unitLedgerEntrySchema, ELedgerEntryTypes, ELedgerReferenceTypes } from './schema'

export type TUnitLedgerEntry = z.infer<typeof unitLedgerEntrySchema>
export type TLedgerEntryType = (typeof ELedgerEntryTypes)[number]
export type TLedgerReferenceType = (typeof ELedgerReferenceTypes)[number]
