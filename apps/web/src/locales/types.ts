export const EAppLanguages = {
  ES: 'es',
  EN: 'en',
} as const

export type TAppLanguages = (typeof EAppLanguages)[keyof typeof EAppLanguages]

export const DEFAULT_LANGUAGE = EAppLanguages.ES
export const SUPPORTED_LANGUAGES = [EAppLanguages.ES, EAppLanguages.EN] as const
