import { managementCompanyCreateSchema } from './createDto'

export const managementCompanyUpdateSchema = managementCompanyCreateSchema.partial()
