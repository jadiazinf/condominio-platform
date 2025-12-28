import { z } from 'zod'
import { ELocationTypes, locationSchema } from './schema'

export type TLocationType = (typeof ELocationTypes)[number]

export type TLocation = z.infer<typeof locationSchema>
