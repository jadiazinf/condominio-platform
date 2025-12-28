import { userCreateSchema } from './createDto'

export const userUpdateSchema = userCreateSchema.partial()
