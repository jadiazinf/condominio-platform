import { z } from 'zod'
import { managementCompanyMemberCreateSchema } from './createDto'
import { managementCompanyMemberUpdateSchema } from './updateDto'

export type TManagementCompanyMemberCreate = z.infer<typeof managementCompanyMemberCreateSchema>
export type TManagementCompanyMemberUpdate = z.infer<typeof managementCompanyMemberUpdateSchema>
