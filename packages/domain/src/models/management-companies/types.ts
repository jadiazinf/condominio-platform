import { z } from 'zod'
import { managementCompanySchema, ETaxIdTypes } from './schema'

export type TTaxIdType = (typeof ETaxIdTypes)[number]
export type TManagementCompany = z.infer<typeof managementCompanySchema>
