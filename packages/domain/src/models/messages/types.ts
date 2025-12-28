import { z } from 'zod'
import { ERecipientTypes, EMessageTypes, EMessagePriorities, messageSchema } from './schema'

export type TRecipientType = (typeof ERecipientTypes)[number]
export type TMessageType = (typeof EMessageTypes)[number]
export type TMessagePriority = (typeof EMessagePriorities)[number]

export type TMessage = z.infer<typeof messageSchema>
