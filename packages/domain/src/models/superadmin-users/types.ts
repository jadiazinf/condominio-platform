import { z } from 'zod'
import { superadminUserSchema } from './schema'

export type TSuperadminUser = z.infer<typeof superadminUserSchema>
