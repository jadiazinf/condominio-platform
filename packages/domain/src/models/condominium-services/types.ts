import { z } from 'zod'
import {
  EServiceProviderTypes,
  condominiumServiceSchema,
  condominiumServiceCreateSchema,
  condominiumServiceUpdateSchema,
} from './schema'

export type TServiceProviderType = (typeof EServiceProviderTypes)[number]
export type TCondominiumService = z.infer<typeof condominiumServiceSchema>
export type TCondominiumServiceCreate = z.infer<typeof condominiumServiceCreateSchema>
export type TCondominiumServiceUpdate = z.infer<typeof condominiumServiceUpdateSchema>
