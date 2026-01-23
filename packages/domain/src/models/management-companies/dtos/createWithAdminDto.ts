import { z } from 'zod'
import { DomainLocaleDictionary } from '../../../i18n/dictionary'

const d = DomainLocaleDictionary.validation.models.managementCompanies
const ud = DomainLocaleDictionary.validation.models.users
const auth = DomainLocaleDictionary.validation.models.auth

/**
 * Step 1: Company Information Schema
 * Validates the management company's basic information
 */
export const companyStepSchema = z.object({
  name: z
    .string({ error: d.name.required })
    .min(1, { error: d.name.required })
    .max(255, { error: d.name.max }),
  legalName: z.string().max(255, { error: d.legalName.max }).nullable().optional(),
  taxId: z.string().max(100, { error: d.taxId.max }).nullable().optional(),
  email: z
    .string()
    .email({ error: d.email.invalid })
    .max(255, { error: d.email.max })
    .nullable()
    .optional(),
  phone: z.string().max(50, { error: d.phone.max }).nullable().optional(),
  website: z
    .string()
    .url({ error: d.website.invalid })
    .max(255, { error: d.website.max })
    .nullable()
    .optional()
    .or(z.literal('')),
  address: z.string().max(500, { error: d.address.max }).nullable().optional(),
})

/**
 * Step 2: Admin User Information Schema
 * Validates the administrator user's information
 */
export const adminStepSchema = z
  .object({
    mode: z.enum(['new', 'existing']).default('new'),
    existingUserId: z.string().uuid({ error: d.createdBy.invalid }).nullable().optional(),
    existingUserEmail: z
      .string()
      .email({ error: auth.email.invalid })
      .max(255, { error: ud.email.max })
      .nullable()
      .optional()
      .or(z.literal('')),
    firstName: z.string().max(100, { error: ud.firstName.max }).nullable().optional(),
    lastName: z.string().max(100, { error: ud.lastName.max }).nullable().optional(),
    email: z
      .string()
      .email({ error: auth.email.invalid })
      .max(255, { error: ud.email.max })
      .nullable()
      .optional()
      .or(z.literal('')),
    phoneCountryCode: z.string().max(10, { error: ud.phoneCountryCode.max }).nullable().optional(),
    phoneNumber: z.string().max(50, { error: ud.phoneNumber.max }).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === 'new') {
      if (!data.firstName || data.firstName.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['firstName'],
          message: auth.firstName.required,
        })
      }

      if (!data.lastName || data.lastName.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['lastName'],
          message: auth.lastName.required,
        })
      }

      if (!data.email || data.email.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['email'],
          message: auth.email.required,
        })
      }
    }

    if (data.mode === 'existing') {
      if (!data.existingUserEmail || data.existingUserEmail.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['existingUserEmail'],
          message: auth.email.required,
        })
      }

      if (!data.existingUserId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['existingUserId'],
          message: d.createdBy.invalid,
        })
      }
    }
  })

/**
 * Combined schema for the complete form
 * This is used for the final submission
 */
export const createManagementCompanyWithAdminFormSchema = z.object({
  company: companyStepSchema,
  admin: adminStepSchema,
})

// Type exports
export type TCompanyStep = z.infer<typeof companyStepSchema>
export type TAdminStep = z.infer<typeof adminStepSchema>
export type TCreateManagementCompanyWithAdminForm = z.infer<
  typeof createManagementCompanyWithAdminFormSchema
>
