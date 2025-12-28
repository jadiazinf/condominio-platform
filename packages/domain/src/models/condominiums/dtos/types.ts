import { z } from 'zod'
import { condominiumCreateSchema } from './createDto'
import { condominiumUpdateSchema } from './updateDto'

export type TCondominiumCreate = z.infer<typeof condominiumCreateSchema>
export type TCondominiumUpdate = z.infer<typeof condominiumUpdateSchema>
