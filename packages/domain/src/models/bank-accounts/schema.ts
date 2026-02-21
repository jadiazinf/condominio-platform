import { z } from 'zod'
import { baseModelSchema, timestampField } from '../../shared/base-model.schema'
import { EBankAccountCategories } from '../banks/schema'
import { DomainLocaleDictionary } from '../../i18n/dictionary'
import {
  ALL_BANK_PAYMENT_METHODS,
  VE_IDENTITY_DOC_TYPES,
  VE_ACCOUNT_TYPES,
  INTERNATIONAL_ACCOUNT_TYPES,
  INTERNATIONAL_HOLDER_TYPES,
  CRYPTO_NETWORKS,
  CRYPTO_CURRENCIES,
} from './constants'

const d = DomainLocaleDictionary.validation.models.bankAccounts

// ─────────────────────────────────────────────────────────────────────────────
// Account Details sub-schemas (JSONB validation)
// ─────────────────────────────────────────────────────────────────────────────

export const bankAccountNationalDetailsSchema = z.object({
  accountNumber: z.string({ error: d.national.accountNumber.required }).length(20, { error: d.national.accountNumber.length }),
  bankCode: z.string({ error: d.national.bankCode.required }).length(4, { error: d.national.bankCode.length }),
  accountType: z.enum(VE_ACCOUNT_TYPES, { error: d.national.accountType.required }),
  identityDocType: z.enum(VE_IDENTITY_DOC_TYPES, { error: d.national.identityDocType.required }),
  identityDocNumber: z.string({ error: d.national.identityDocNumber.required }).min(1).max(20),
  phoneNumber: z.string().max(15).optional(),
})

export const bankAccountInternationalDetailsSchema = z.object({
  // Wire / ACH
  swiftCode: z.string().max(11).optional(),
  iban: z.string().max(34).optional(),
  routingNumber: z.string().max(9).optional(),
  accountNumber: z.string().max(50).optional(),
  bankAddress: z.string().max(500).optional(),
  bankCountry: z.string().length(2).optional(),
  beneficiaryAddress: z.string().max(500).optional(),
  accountType: z.enum(INTERNATIONAL_ACCOUNT_TYPES).optional(),
  accountHolderType: z.enum(INTERNATIONAL_HOLDER_TYPES).optional(),
  // Zelle
  zelleEmail: z.string().email().optional(),
  zellePhone: z.string().max(20).optional(),
  // PayPal / Wise
  paypalEmail: z.string().email().optional(),
  wiseEmail: z.string().email().optional(),
  // Crypto
  walletAddress: z.string().max(255).optional(),
  cryptoNetwork: z.enum(CRYPTO_NETWORKS).optional(),
  cryptoCurrency: z.enum(CRYPTO_CURRENCIES).optional(),
  // Stripe (future)
  stripeAccountId: z.string().max(255).optional(),
  stripeExternalAccountId: z.string().max(255).optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Main entity schema
// ─────────────────────────────────────────────────────────────────────────────

export const bankAccountSchema = baseModelSchema.extend({
  managementCompanyId: z.uuid(),
  bankId: z.uuid().nullable(),
  accountCategory: z.enum(EBankAccountCategories),
  displayName: z.string().max(255),
  bankName: z.string().max(255),
  accountHolderName: z.string().max(255),
  currency: z.string().length(3),
  accountDetails: z.union([bankAccountNationalDetailsSchema, bankAccountInternationalDetailsSchema]),
  acceptedPaymentMethods: z.array(z.enum(ALL_BANK_PAYMENT_METHODS)).min(1),
  appliesToAllCondominiums: z.boolean().default(false),
  isActive: z.boolean().default(true),
  notes: z.string().nullable(),
  createdBy: z.uuid(),
  deactivatedBy: z.uuid().nullable(),
  deactivatedAt: timestampField.nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  // Relations (populated optionally)
  condominiumIds: z.array(z.uuid()).optional(),
  bank: z.object({ id: z.uuid(), name: z.string(), code: z.string().nullable() }).optional(),
  creator: z.object({ id: z.uuid(), displayName: z.string().nullable(), email: z.string() }).optional(),
  deactivator: z.object({ id: z.uuid(), displayName: z.string().nullable(), email: z.string() }).optional(),
})

// ─────────────────────────────────────────────────────────────────────────────
// Create DTO — with cross-field validation per category + methods
// ─────────────────────────────────────────────────────────────────────────────

export const bankAccountCreateSchema = z
  .object({
    bankId: z.uuid().optional(),
    accountCategory: z.enum(EBankAccountCategories, { error: d.accountCategory.invalid }),
    displayName: z.string({ error: d.displayName.required }).min(1).max(255, { error: d.displayName.max }),
    bankName: z.string({ error: d.bankName.required }).min(1).max(255, { error: d.bankName.max }),
    accountHolderName: z.string({ error: d.accountHolderName.required }).min(1).max(255, { error: d.accountHolderName.max }),
    currency: z.string({ error: d.currency.required }).length(3, { error: d.currency.length }),
    accountDetails: z.record(z.string(), z.unknown()),
    acceptedPaymentMethods: z.array(z.enum(ALL_BANK_PAYMENT_METHODS)).min(1, { error: d.acceptedPaymentMethods.required }),
    appliesToAllCondominiums: z.boolean().default(false),
    condominiumIds: z.array(z.uuid()).optional(),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const details = data.accountDetails as Record<string, unknown>
    const methods = data.acceptedPaymentMethods

    if (data.accountCategory === 'national') {
      const result = bankAccountNationalDetailsSchema.safeParse(details)
      if (!result.success) {
        for (const issue of result.error.issues) {
          ctx.addIssue({
            ...issue,
            path: ['accountDetails', ...issue.path],
          })
        }
        return
      }

      if (methods.includes('pago_movil') && !details.phoneNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: d.national.phoneNumber.requiredForPagoMovil,
          path: ['accountDetails', 'phoneNumber'],
        })
      }
    }

    if (data.accountCategory === 'international') {
      const result = bankAccountInternationalDetailsSchema.safeParse(details)
      if (!result.success) {
        for (const issue of result.error.issues) {
          ctx.addIssue({
            ...issue,
            path: ['accountDetails', ...issue.path],
          })
        }
        return
      }

      // Wire Transfer: swiftCode + accountNumber required
      if (methods.includes('wire_transfer')) {
        if (!details.swiftCode) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: d.international.swiftCode.required,
            path: ['accountDetails', 'swiftCode'],
          })
        }
        if (!details.accountNumber) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: d.international.accountNumber.required,
            path: ['accountDetails', 'accountNumber'],
          })
        }
      }

      // ACH: routingNumber (9 digits), accountNumber, accountType, accountHolderType
      if (methods.includes('ach')) {
        if (!details.routingNumber) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: d.international.routingNumber.required,
            path: ['accountDetails', 'routingNumber'],
          })
        } else if (typeof details.routingNumber === 'string' && details.routingNumber.length !== 9) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: d.international.routingNumber.length,
            path: ['accountDetails', 'routingNumber'],
          })
        }
        if (!details.accountNumber) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: d.international.accountNumber.required,
            path: ['accountDetails', 'accountNumber'],
          })
        }
        if (!details.accountType) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: d.international.accountType.required,
            path: ['accountDetails', 'accountType'],
          })
        }
        if (!details.accountHolderType) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: d.international.accountHolderType.required,
            path: ['accountDetails', 'accountHolderType'],
          })
        }
      }

      // Zelle: at least one of zelleEmail or zellePhone
      if (methods.includes('zelle')) {
        if (!details.zelleEmail && !details.zellePhone) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: d.international.zelleContact.required,
            path: ['accountDetails', 'zelleEmail'],
          })
        }
      }

      // PayPal: paypalEmail required
      if (methods.includes('paypal')) {
        if (!details.paypalEmail) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: d.international.paypalEmail.required,
            path: ['accountDetails', 'paypalEmail'],
          })
        }
      }

      // Wise: wiseEmail required
      if (methods.includes('wise')) {
        if (!details.wiseEmail) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: d.international.wiseEmail.required,
            path: ['accountDetails', 'wiseEmail'],
          })
        }
      }

      // Crypto: walletAddress, cryptoNetwork, cryptoCurrency
      if (methods.includes('crypto')) {
        if (!details.walletAddress) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: d.international.walletAddress.required,
            path: ['accountDetails', 'walletAddress'],
          })
        }
        if (!details.cryptoNetwork) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: d.international.cryptoNetwork.required,
            path: ['accountDetails', 'cryptoNetwork'],
          })
        }
        if (!details.cryptoCurrency) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: d.international.cryptoCurrency.required,
            path: ['accountDetails', 'cryptoCurrency'],
          })
        }
      }
    }
  })
