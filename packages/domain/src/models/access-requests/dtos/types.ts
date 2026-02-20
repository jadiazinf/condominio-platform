import { z } from 'zod'
import { accessRequestCreateSchema, accessRequestReviewSchema, validateAccessCodeSchema } from './createDto'

export type TAccessRequestCreate = z.infer<typeof accessRequestCreateSchema>
export type TAccessRequestReview = z.infer<typeof accessRequestReviewSchema>
export type TValidateAccessCode = z.infer<typeof validateAccessCodeSchema>
