import { z } from 'zod'
import { messageCreateSchema } from './createDto'
import { messageUpdateSchema } from './updateDto'

export type TMessageCreate = z.infer<typeof messageCreateSchema>
export type TMessageUpdate = z.infer<typeof messageUpdateSchema>
