import { z } from 'zod'
import { managementCompanySchema } from './schema'

export type TManagementCompany = z.infer<typeof managementCompanySchema>
