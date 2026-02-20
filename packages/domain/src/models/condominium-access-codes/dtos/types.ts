import { z } from 'zod'
import { condominiumAccessCodeCreateSchema } from './createDto'

export type TCondominiumAccessCodeCreate = z.infer<typeof condominiumAccessCodeCreateSchema>
