import type { NextRequest } from 'next/server'

import { NextResponse } from 'next/server'

const LOCALE_COOKIE = 'NEXT_LOCALE'
const SUPPORTED_LOCALES = ['es', 'en']
const DEFAULT_LOCALE = 'es'

function getLocaleFromHeaders(request: NextRequest): string {
  const acceptLanguage = request.headers.get('accept-language')

  if (!acceptLanguage) return DEFAULT_LOCALE

  const preferredLocales = acceptLanguage
    .split(',')
    .map(lang => {
      const [locale, priority = 'q=1'] = lang.trim().split(';')
      const q = parseFloat(priority.replace('q=', '')) || 1

      return { locale: locale.split('-')[0], q }
    })
    .sort((a, b) => b.q - a.q)

  for (const { locale } of preferredLocales) {
    if (SUPPORTED_LOCALES.includes(locale)) {
      return locale
    }
  }

  return DEFAULT_LOCALE
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  const existingLocale = request.cookies.get(LOCALE_COOKIE)?.value

  if (!existingLocale || !SUPPORTED_LOCALES.includes(existingLocale)) {
    const detectedLocale = getLocaleFromHeaders(request)

    response.cookies.set(LOCALE_COOKIE, detectedLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
