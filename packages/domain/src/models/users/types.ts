import { z } from 'zod'
import { EIdDocumentTypes, EPreferredLanguages, userSchema } from './schema'

export type TIdDocumentType = (typeof EIdDocumentTypes)[number]
export type TPreferredLanguage = (typeof EPreferredLanguages)[number]

export type TUser = z.infer<typeof userSchema>
