import { z } from 'zod'
import { condominiumSchema } from './schema'

export type TCondominium = z.infer<typeof condominiumSchema>
