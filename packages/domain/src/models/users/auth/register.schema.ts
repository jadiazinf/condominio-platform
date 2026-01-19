import { z } from 'zod'

import { DomainLocaleDictionary } from '../../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.auth

/**
 * Schema for registering a user after Firebase authentication.
 * Works for any Firebase auth method (email/password, Google, etc.).
 * The Firebase token is sent in the Authorization header.
 * This body contains additional user preferences.
 */
export const registerSchema = z.object({
  /** User's first name */
  firstName: z.string().min(1, { error: d.firstName.required }).max(100),
  /** User's last name */
  lastName: z.string().min(1, { error: d.lastName.required }).max(100),
  /** User's preferred language */
  preferredLanguage: z.enum(['es', 'en']).default('es'),
  /** User must accept terms and conditions */
  acceptTerms: z.boolean().refine(val => val === true, {
    message: d.acceptTerms.required,
  }),
})

export type TRegisterSchema = z.infer<typeof registerSchema>
