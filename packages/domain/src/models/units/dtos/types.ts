import { z } from 'zod'
import { unitCreateSchema } from './createDto'
import { unitUpdateSchema } from './updateDto'

export type TUnitCreate = z.infer<typeof unitCreateSchema>
export type TUnitUpdate = z.infer<typeof unitUpdateSchema>
