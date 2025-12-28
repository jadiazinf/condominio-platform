import { z } from 'zod'
import { currencyCreateSchema } from './createDto'
import { currencyUpdateSchema } from './updateDto'

export type TCurrencyCreate = z.infer<typeof currencyCreateSchema>
export type TCurrencyUpdate = z.infer<typeof currencyUpdateSchema>
