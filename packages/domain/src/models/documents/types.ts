import { z } from 'zod'
import { EDocumentTypes, documentSchema } from './schema'

export type TDocumentType = (typeof EDocumentTypes)[number]

export type TDocument = z.infer<typeof documentSchema>
