import { z } from 'zod'
import { EAccessCodeValidity, condominiumAccessCodeSchema } from './schema'

export type TAccessCodeValidity = (typeof EAccessCodeValidity)[number]
export type TCondominiumAccessCode = z.infer<typeof condominiumAccessCodeSchema>
