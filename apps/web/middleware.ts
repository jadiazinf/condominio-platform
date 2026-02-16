import type { NextRequest } from 'next/server'

import { NextResponse } from 'next/server'

const SESSION_COOKIE_NAME = '__session'
const LOCALE_COOKIE = 'NEXT_LOCALE'
const SUPPORTED_LOCALES = ['es', 'en']
const DEFAULT_LOCALE = 'es'

const protectedRoutes = ['/dashboard']
const authRoutes = ['/auth', '/signup', '/forgot-password']

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

function handleLocale(request: NextRequest, skipAuthRedirect = false): NextResponse {
  // Create request headers to pass info to Server Components
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)

  // When session has issues, remove the session cookie from the request headers
  // so server components (auth layout) don't see it and don't redirect to dashboard.
  // Also set the skip header as a secondary signal.
  if (skipAuthRedirect) {
    requestHeaders.set('x-skip-auth-redirect', 'true')
    // Remove __session from the Cookie header so cookies() in server components returns empty
    const cookieHeader = requestHeaders.get('cookie') || ''
    const filteredCookies = cookieHeader
      .split(';')
      .map(c => c.trim())
      .filter(c => !c.startsWith(`${SESSION_COOKIE_NAME}=`))
      .join('; ')
    requestHeaders.set('cookie', filteredCookies)
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

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

  // Loading page is only needed for registration and signout flows
  // These require client-side processing (sessionStorage for registration, Firebase SDK for signout)
  if (pathname === '/loading') {
    const isRegistrationFlow = request.nextUrl.searchParams.get('register') === 'true'
    const isSignoutFlow = request.nextUrl.searchParams.get('signout') === 'true'

    // Only allow loading page for special flows, redirect others to dashboard or signin
    if (!isRegistrationFlow && !isSignoutFlow) {
      return NextResponse.redirect(new URL(hasSession ? '/dashboard' : '/auth', request.url))
    }

    return handleLocale(request)
  }

  const isProtectedRoute = protectedRoutes.some(function (route) {
    return pathname.startsWith(route)
  })
  const isAuthRoute = authRoutes.some(function (route) {
    return pathname.startsWith(route)
  })

  // Protect routes - redirect to signin if no session
  if (isProtectedRoute && !hasSession) {
    const signInUrl = new URL('/auth', request.url)

    signInUrl.searchParams.set('redirect', pathname)

    return NextResponse.redirect(signInUrl)
  }

  // Don't redirect to dashboard if session has issues that need client-side handling
  // (let client clear cookies and show appropriate message)
  const isExpiredSession = request.nextUrl.searchParams.get('expired') === 'true'
  const hasTemporaryError = request.nextUrl.searchParams.get('error') === 'temporary'
  const isUserNotFound = request.nextUrl.searchParams.get('notfound') === 'true'
  const isInactivityLogout = request.nextUrl.searchParams.get('inactivity') === 'true'

  // Redirect authenticated users away from auth routes
  if (isAuthRoute && hasSession && !isExpiredSession && !hasTemporaryError && !isUserNotFound && !isInactivityLogout) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // When session has issues (expired, inactivity, etc.), clear the cookie directly in the response
  // This prevents redirect loops between auth layout (sees cookie → redirects to dashboard)
  // and dashboard (sees expired token → redirects to auth)
  const hasSessionIssue = isExpiredSession || hasTemporaryError || isUserNotFound || isInactivityLogout
  const skipAuthRedirect = isAuthRoute && hasSessionIssue

  const response = handleLocale(request, skipAuthRedirect)

  if (skipAuthRedirect && hasSession) {
    response.cookies.delete(SESSION_COOKIE_NAME)
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
