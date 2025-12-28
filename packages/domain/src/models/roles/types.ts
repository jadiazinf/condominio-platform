import { z } from 'zod'
import { roleSchema } from './schema'

export type TRole = z.infer<typeof roleSchema>
