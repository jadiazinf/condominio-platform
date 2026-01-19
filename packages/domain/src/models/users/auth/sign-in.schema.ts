import { z } from 'zod'

import { DomainLocaleDictionary } from '../../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.auth

export const signInSchema = z.object({
  email: z.email({ error: d.email.invalid }),
  password: z.string().min(1, { error: d.password.required }),
  rememberMe: z.boolean(),
})

export type TSignInSchema = z.infer<typeof signInSchema>
