import { z } from 'zod'
import { documentCreateSchema } from './createDto'
import { documentUpdateSchema } from './updateDto'

export type TDocumentCreate = z.infer<typeof documentCreateSchema>
export type TDocumentUpdate = z.infer<typeof documentUpdateSchema>
