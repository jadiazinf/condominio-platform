import { z } from 'zod'
import { currencySchema } from './schema'

export type TCurrency = z.infer<typeof currencySchema>
