import { z } from 'zod'

import { DomainLocaleDictionary } from '../../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.auth

export const signInSchema = z.object({
  email: z.email({ error: d.email.invalid }),
  password: z.string().min(8, { error: d.password.min }),
  rememberMe: z.boolean().default(false),
})

export type TSignInSchema = z.infer<typeof signInSchema>
