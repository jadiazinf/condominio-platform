import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { fetchUserByFirebaseUid, FetchUserError } from '@packages/http-client'

import { verifySessionToken } from '@/libs/firebase/server'

interface ValidateResponse {
  valid: boolean
  error?: 'no_session' | 'expired' | 'not_found' | 'temporary'
}

export async function GET(): Promise<NextResponse<ValidateResponse>> {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get('__session')?.value

    if (!sessionToken) {
      return NextResponse.json({ valid: false, error: 'no_session' })
    }

    // Validate token
    const decodedToken = await verifySessionToken(sessionToken)

    if (!decodedToken) {
      return NextResponse.json({ valid: false, error: 'expired' })
    }

    // Try to fetch user - this is the call that might fail with 429
    const user = await fetchUserByFirebaseUid(decodedToken.uid, sessionToken)

    if (!user) {
      return NextResponse.json({ valid: false, error: 'not_found' })
    }

    // Session is valid
    return NextResponse.json({ valid: true })
  } catch (error) {
    // Handle retryable errors (429, 5xx)
    if (error instanceof FetchUserError && error.isRetryable) {
      return NextResponse.json({ valid: false, error: 'temporary' }, { status: 503 })
    }

    // Other errors - treat as temporary
    return NextResponse.json({ valid: false, error: 'temporary' }, { status: 503 })
  }
}
