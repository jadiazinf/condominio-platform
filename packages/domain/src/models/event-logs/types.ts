import { z } from 'zod'
import {
  EEventLogCategories,
  EEventLogLevels,
  EEventLogResults,
  EEventLogSources,
  eventLogSchema,
} from './schema'

export type TEventLogCategory = (typeof EEventLogCategories)[number]
export type TEventLogLevel = (typeof EEventLogLevels)[number]
export type TEventLogResult = (typeof EEventLogResults)[number]
export type TEventLogSource = (typeof EEventLogSources)[number]
export type TEventLog = z.infer<typeof eventLogSchema>
