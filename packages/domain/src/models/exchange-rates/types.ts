import { z } from 'zod'
import { exchangeRateSchema } from './schema'

export type TExchangeRate = z.infer<typeof exchangeRateSchema>
