import { z } from 'zod'
import { eventLogCreateSchema } from './createDto'

export type TEventLogCreate = z.infer<typeof eventLogCreateSchema>
