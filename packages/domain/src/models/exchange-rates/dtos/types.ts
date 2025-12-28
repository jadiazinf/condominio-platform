import { z } from 'zod'
import { exchangeRateCreateSchema } from './createDto'
import { exchangeRateUpdateSchema } from './updateDto'

export type TExchangeRateCreate = z.infer<typeof exchangeRateCreateSchema>
export type TExchangeRateUpdate = z.infer<typeof exchangeRateUpdateSchema>
