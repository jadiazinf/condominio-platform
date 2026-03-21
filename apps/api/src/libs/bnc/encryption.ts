import { createCipheriv, createDecipheriv, pbkdf2Sync, createHash, randomBytes } from 'crypto'

// BNC ESolutions API v2.1 encryption parameters
const SALT = Buffer.from('49 76 61 6e 20 4d 65 64 76 65 64 65 76'.replace(/ /g, ''), 'hex') // "Ivan Medvedev"
const ITERATIONS = 1000
const KEY_SIZE = 32 // AES-256
const IV_SIZE = 16
const ALGORITHM = 'aes-256-cbc'
const HASH_ALGORITHM = 'sha1'

/**
 * Derives AES-256 key and IV from a passphrase using PBKDF2
 * as specified by BNC ESolutions API v2.1 (Rijndael / AES-256-CBC).
 */
function deriveKeyAndIv(passphrase: string): { key: Buffer; iv: Buffer } {
  const derived = pbkdf2Sync(passphrase, SALT, ITERATIONS, KEY_SIZE + IV_SIZE, HASH_ALGORITHM)

  return {
    key: derived.subarray(0, KEY_SIZE),
    iv: derived.subarray(KEY_SIZE, KEY_SIZE + IV_SIZE),
  }
}

/**
 * Encrypts a plaintext string using AES-256-CBC with PBKDF2-derived key.
 * Returns a base64-encoded ciphertext.
 *
 * @param plaintext - The JSON string to encrypt
 * @param passphrase - The WorkingKey (or MasterKey for LogOn)
 * @returns Base64-encoded encrypted string
 */
export function encrypt(plaintext: string, passphrase: string): string {
  const { key, iv } = deriveKeyAndIv(passphrase)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'base64')
  encrypted += cipher.final('base64')

  return encrypted
}

/**
 * Decrypts a base64-encoded ciphertext using AES-256-CBC with PBKDF2-derived key.
 * Returns the original plaintext string.
 *
 * @param ciphertext - Base64-encoded encrypted string
 * @param passphrase - The WorkingKey (or MasterKey for LogOn)
 * @returns Decrypted plaintext string
 */
export function decrypt(ciphertext: string, passphrase: string): string {
  const { key, iv } = deriveKeyAndIv(passphrase)
  const decipher = createDecipheriv(ALGORITHM, key, iv)

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Generates a SHA-256 hash for the BNC request Validation field.
 *
 * @param data - The string to hash (typically ClientGUID + Reference + encrypted Value)
 * @returns Hex-encoded SHA-256 hash
 */
export function sha256Hash(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex')
}

/**
 * Generates a unique daily reference for BNC API requests.
 * Must be unique per day. Format: YYYYMMDD-HHMMSS-RANDOM
 */
export function generateReference(): string {
  const now = new Date()
  const date = now.toISOString().replace(/[-:T]/g, '').slice(0, 14)
  const random = randomBytes(4).toString('hex')

  return `${date}-${random}`
}
