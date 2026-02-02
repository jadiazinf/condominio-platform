import { cookies } from 'next/headers'

const SESSION_COOKIE_NAME = '__session'

/**
 * Gets the auth token from server-side cookies.
 *
 * This function is used in Server Components and Server Actions to get
 * the authentication token needed for API calls.
 *
 * @throws {Error} If no session token is found
 * @returns {Promise<string>} The session token
 */
export async function getServerAuthToken(): Promise<string> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!sessionToken) {
    throw new Error('No session token found')
  }

  return sessionToken
}
