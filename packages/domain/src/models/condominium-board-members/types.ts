import { z } from 'zod'
import {
  condominiumBoardMemberSchema,
  condominiumBoardMemberCreateSchema,
  condominiumBoardMemberUpdateSchema,
  EBoardPositions,
  EBoardMemberStatuses,
} from './schema'

export type TCondominiumBoardMember = z.infer<typeof condominiumBoardMemberSchema>
export type TCondominiumBoardMemberCreate = z.infer<typeof condominiumBoardMemberCreateSchema>
export type TCondominiumBoardMemberUpdate = z.infer<typeof condominiumBoardMemberUpdateSchema>
export type TBoardPosition = (typeof EBoardPositions)[number]
export type TBoardMemberStatus = (typeof EBoardMemberStatuses)[number]
