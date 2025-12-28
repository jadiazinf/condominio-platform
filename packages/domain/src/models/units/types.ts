import { z } from 'zod'
import { unitSchema } from './schema'

export type TUnit = z.infer<typeof unitSchema>
