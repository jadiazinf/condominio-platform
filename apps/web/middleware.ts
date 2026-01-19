import type { NextRequest } from 'next/server'

import { NextResponse } from 'next/server'

const SESSION_COOKIE_NAME = '__session'
const LOCALE_COOKIE = 'NEXT_LOCALE'
const SUPPORTED_LOCALES = ['es', 'en']
const DEFAULT_LOCALE = 'es'

const protectedRoutes = ['/dashboard']
const authRoutes = ['/signin', '/signup']

function getLocaleFromHeaders(request: NextRequest): string {
  const acceptLanguage = request.headers.get('accept-language')

  if (!acceptLanguage) return DEFAULT_LOCALE

  const preferredLocales = acceptLanguage
    .split(',')
    .map(function (lang) {
      const [locale, priority = 'q=1'] = lang.trim().split(';')
      const q = parseFloat(priority.replace('q=', '')) || 1

      return { locale: locale.split('-')[0], q }
    })
    .sort(function (a, b) {
      return b.q - a.q
    })

  for (const { locale } of preferredLocales) {
    if (SUPPORTED_LOCALES.includes(locale)) {
      return locale
    }
  }

  return DEFAULT_LOCALE
}

function handleLocale(request: NextRequest): NextResponse {
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)
  const hasSession = !!sessionCookie?.value

  // Skip auth middleware for loading page - it handles its own redirects
  if (pathname === '/loading') {
    return handleLocale(request)
  }

  const isProtectedRoute = protectedRoutes.some(function (route) {
    return pathname.startsWith(route)
  })
  const isAuthRoute = authRoutes.some(function (route) {
    return pathname.startsWith(route)
  })

  if (isProtectedRoute && !hasSession) {
    const signInUrl = new URL('/signin', request.url)

    signInUrl.searchParams.set('redirect', pathname)

    return NextResponse.redirect(signInUrl)
  }

  // Don't redirect to dashboard if session is expired (let client clear cookies)
  const isExpiredSession = request.nextUrl.searchParams.get('expired') === 'true'

  if (isAuthRoute && hasSession && !isExpiredSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return handleLocale(request)
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
