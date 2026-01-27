import { z } from 'zod'
import { managementCompanySubscriptionCreateSchema } from './createDto'
import { managementCompanySubscriptionUpdateSchema } from './updateDto'

export type TManagementCompanySubscriptionCreate = z.infer<typeof managementCompanySubscriptionCreateSchema>
export type TManagementCompanySubscriptionUpdate = z.infer<typeof managementCompanySubscriptionUpdateSchema>
