import { z } from 'zod'
import { managementCompanyCreateSchema } from './createDto'
import { managementCompanyUpdateSchema } from './updateDto'

export type TManagementCompanyCreate = z.infer<typeof managementCompanyCreateSchema>
export type TManagementCompanyUpdate = z.infer<typeof managementCompanyUpdateSchema>
