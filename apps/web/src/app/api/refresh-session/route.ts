import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const COOKIES_TO_CLEAR = [
  '__user',
  '__condominiums',
  '__selected_condominium',
  '__superadmin',
  '__management_companies',
  '__active_role',
]

/**
 * GET /api/refresh-session
 *
 * Clears cached session cookies and redirects to the dashboard.
 * This forces getFullSession() to fetch fresh data from the API,
 * ensuring the user sees up-to-date information (e.g., after
 * an access request is approved).
 *
 * The __session cookie (Firebase token) is preserved — the user
 * stays authenticated.
 */
export async function GET() {
  const cookieStore = await cookies()

  for (const name of COOKIES_TO_CLEAR) {
    cookieStore.delete(name)
  }

  return NextResponse.redirect(new URL('/dashboard', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'))
}
