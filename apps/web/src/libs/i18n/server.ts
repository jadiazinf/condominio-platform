import { cookies } from 'next/headers'
import { IntlMessageFormat } from 'intl-messageformat'
import { domainLocalesEs, domainLocalesEn } from '@packages/domain'

import {
  appLocalesEs,
  appLocalesEn,
  EAppLanguages,
  DEFAULT_LANGUAGE,
  type TAppLanguages,
} from '@/locales'

const LOCALE_COOKIE = 'NEXT_LOCALE'

type TMessages = Record<string, unknown>

function deepMerge<T extends TMessages>(target: T, source: TMessages): T {
  const result = { ...target } as TMessages

  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key] as TMessages, source[key] as TMessages)
    } else {
      result[key] = source[key]
    }
  }

  return result as T
}

function getNestedValue(obj: TMessages, path: string): string | undefined {
  const keys = path.split('.')
  let current: unknown = obj

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as TMessages)[key]
  }

  return typeof current === 'string' ? current : undefined
}

const allMessages: Record<TAppLanguages, TMessages> = {
  [EAppLanguages.ES]: deepMerge(domainLocalesEs as TMessages, appLocalesEs as TMessages),
  [EAppLanguages.EN]: deepMerge(domainLocalesEn as TMessages, appLocalesEn as TMessages),
}

export async function getLocale(): Promise<TAppLanguages> {
  const cookieStore = await cookies()
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value

  if (localeCookie && (localeCookie === EAppLanguages.ES || localeCookie === EAppLanguages.EN)) {
    return localeCookie as TAppLanguages
  }

  return DEFAULT_LANGUAGE
}

export async function getTranslations() {
  const locale = await getLocale()
  const messages = allMessages[locale]

  function t(key: string, values?: Record<string, string | number>): string {
    const message = getNestedValue(messages, key)

    if (!message) {
      console.warn(`[i18n] Missing translation for key: ${key}`)

      return key
    }

    if (values) {
      try {
        const formatter = new IntlMessageFormat(message, locale)

        return formatter.format(values) as string
      } catch (error) {
        console.warn(`[i18n] Error formatting message for key: ${key}`, error)

        return message
      }
    }

    return message
  }

  return { t, locale }
}
