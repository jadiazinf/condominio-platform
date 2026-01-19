import { z } from 'zod'

import { DomainLocaleDictionary } from '../../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.auth

/**
 * Schema for registering a user via Google Sign-In.
 * The Firebase token is sent in the Authorization header.
 * This body contains additional user preferences.
 */
export const googleRegisterSchema = z.object({
  /** User's first name (from Google profile or edited by user) */
  firstName: z.string().min(1, { error: d.firstName.required }).max(100).nullable().optional(),
  /** User's last name (from Google profile or edited by user) */
  lastName: z.string().min(1, { error: d.lastName.required }).max(100).nullable().optional(),
  /** User's preferred language */
  preferredLanguage: z.enum(['es', 'en']).default('es'),
  /** User must accept terms and conditions */
  acceptTerms: z.boolean().refine(val => val === true, {
    message: d.acceptTerms.required,
  }),
})

export type TGoogleRegisterSchema = z.infer<typeof googleRegisterSchema>
