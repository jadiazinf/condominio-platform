import { z } from 'zod'
import { baseModelSchema } from './base-model.schema'

export type TBaseModel = z.infer<typeof baseModelSchema>
