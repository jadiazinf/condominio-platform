import type { TCreateEnumValue } from '@src/utils/enums'

export const EAppLanguages = {
  ES: 'es',
  EN: 'en',
} as const

export type TAppLanguages = TCreateEnumValue<typeof EAppLanguages>
