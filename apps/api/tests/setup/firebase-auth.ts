import { admin } from '@libs/firebase/config'

/**
 * Generates a valid Firebase ID token for testing purposes.
 *
 * This function:
 * 1. Creates a custom token using the Firebase Admin SDK.
 * 2. Exchanges the custom token for an ID token using the Firebase Auth REST API.
 *
 * Requires FIREBASE_API_KEY environment variable to be set.
 *
 * @param uid The user ID to generate the token for.
 * @returns A promise that resolves to the ID token string.
 */
export async function getAuthenticatedToken(uid: string): Promise<string> {
  // 1. Create a custom token using the Admin SDK
  const customToken = await admin.auth().createCustomToken(uid)

  // If we are using a mocked Admin SDK that returns a placeholder custom token,
  // we should return a placeholder ID token as well, to avoid hitting the real API
  // with an invalid custom token.
  if (customToken.startsWith('custom-token-')) {
    return `placeholder-token:${uid}`
  }

  // 2. Exchange the custom token for an ID token using the Firebase Auth REST API
  // We need the Web API Key for this. It should be in the environment variables.
  const apiKey = process.env.FIREBASE_API_KEY

  if (!apiKey) {
    console.warn(
      'FIREBASE_API_KEY is not defined. Using a placeholder token which will likely fail validation if not mocked.'
    )
    return `placeholder-token:${uid}`
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: customToken,
        returnSecureToken: true,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange custom token for ID token: ${error}`)
  }

  const data = (await response.json()) as { idToken: string }
  return data.idToken
}
