import { currencyCreateSchema } from './createDto'

export const currencyUpdateSchema = currencyCreateSchema.partial()
