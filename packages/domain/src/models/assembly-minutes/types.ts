import { z } from 'zod'
import {
  assemblyMinuteSchema,
  assemblyMinuteCreateSchema,
  assemblyMinuteUpdateSchema,
  EAssemblyTypes,
  EAssemblyMinuteStatuses,
} from './schema'

export type TAssemblyMinute = z.infer<typeof assemblyMinuteSchema>
export type TAssemblyMinuteCreate = z.infer<typeof assemblyMinuteCreateSchema>
export type TAssemblyMinuteUpdate = z.infer<typeof assemblyMinuteUpdateSchema>
export type TAssemblyType = (typeof EAssemblyTypes)[number]
export type TAssemblyMinuteStatus = (typeof EAssemblyMinuteStatuses)[number]
