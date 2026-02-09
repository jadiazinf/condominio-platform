import { z } from 'zod'
import { amenitySchema } from './schema'

export type TAmenity = z.infer<typeof amenitySchema>
