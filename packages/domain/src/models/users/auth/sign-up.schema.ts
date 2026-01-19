import { z } from 'zod'

import { DomainLocaleDictionary } from '../../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.auth

export const signUpSchema = z
  .object({
    email: z.email({ error: d.email.invalid }),
    firstName: z.string().min(1, { error: d.firstName.required }),
    lastName: z.string().min(1, { error: d.lastName.required }),
    password: z.string().min(8, { error: d.password.min }),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine(val => val === true, {
      message: d.acceptTerms.required,
    }),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: d.confirmPassword.mismatch,
    path: ['confirmPassword'],
  })

export type TSignUpSchema = z.infer<typeof signUpSchema>
