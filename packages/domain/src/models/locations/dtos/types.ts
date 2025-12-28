import { z } from 'zod'
import { locationCreateSchema } from './createDto'
import { locationUpdateSchema } from './updateDto'

export type TLocationCreate = z.infer<typeof locationCreateSchema>
export type TLocationUpdate = z.infer<typeof locationUpdateSchema>
