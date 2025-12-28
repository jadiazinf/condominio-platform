import { z } from 'zod'
import { interestConfigurationCreateSchema } from './createDto'
import { interestConfigurationUpdateSchema } from './updateDto'

export type TInterestConfigurationCreate = z.infer<typeof interestConfigurationCreateSchema>
export type TInterestConfigurationUpdate = z.infer<typeof interestConfigurationUpdateSchema>
