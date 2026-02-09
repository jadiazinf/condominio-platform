import { z } from 'zod'
import { amenityCreateSchema } from './createDto'
import { amenityUpdateSchema } from './updateDto'

export type TAmenityCreate = z.infer<typeof amenityCreateSchema>
export type TAmenityUpdate = z.infer<typeof amenityUpdateSchema>
