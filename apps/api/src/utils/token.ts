import { createHash, randomBytes } from 'crypto'

/**
 * Generates a secure random token suitable for invitation links.
 * The token is URL-safe and cryptographically random.
 *
 * @param length - The length of the token in bytes (default: 32)
 * @returns A URL-safe base64 encoded token
 */
export function generateSecureToken(length = 32): string {
  const buffer = randomBytes(length)
  // Use URL-safe base64 encoding
  return buffer.toString('base64url')
}

/**
 * Creates a SHA-256 hash of a token for secure storage.
 * The original token should never be stored; only the hash.
 *
 * @param token - The plain text token to hash
 * @returns The SHA-256 hash as a hex string
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Verifies if a plain text token matches a stored hash.
 *
 * @param token - The plain text token to verify
 * @param hash - The stored hash to compare against
 * @returns True if the token matches the hash
 */
export function verifyTokenHash(token: string, hash: string): boolean {
  const tokenHash = hashToken(token)
  // Use timing-safe comparison to prevent timing attacks
  if (tokenHash.length !== hash.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < tokenHash.length; i++) {
    result |= tokenHash.charCodeAt(i) ^ hash.charCodeAt(i)
  }
  return result === 0
}

/**
 * Calculates an expiration date from now.
 *
 * @param days - Number of days until expiration (default: 7)
 * @returns The expiration date
 */
export function calculateExpirationDate(days = 7): Date {
  const expirationDate = new Date()
  expirationDate.setDate(expirationDate.getDate() + days)
  return expirationDate
}
