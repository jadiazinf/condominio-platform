import { describe, it, expect } from 'bun:test'
import { encrypt, decrypt, sha256Hash, generateReference } from './encryption'

describe('BNC Encryption', () => {
  const testPassphrase = 'test-working-key-12345'

  describe('encrypt / decrypt', () => {
    it('should roundtrip encrypt and decrypt a simple string', () => {
      const plaintext = 'Hello, BNC!'
      const encrypted = encrypt(plaintext, testPassphrase)
      const decrypted = decrypt(encrypted, testPassphrase)

      expect(decrypted).toBe(plaintext)
    })

    it('should roundtrip encrypt and decrypt a JSON payload', () => {
      const payload = JSON.stringify({
        DebtorBankCode: 102,
        DebtorCellPhone: '584121234567',
        DebtorID: 'V12345678',
        Amount: 150.5,
        Token: 'ABC12345',
        Terminal: 'TERM0001',
      })

      const encrypted = encrypt(payload, testPassphrase)
      const decrypted = decrypt(encrypted, testPassphrase)

      expect(decrypted).toBe(payload)
      expect(JSON.parse(decrypted)).toEqual(JSON.parse(payload))
    })

    it('should produce different ciphertext than plaintext', () => {
      const plaintext = 'test data'
      const encrypted = encrypt(plaintext, testPassphrase)

      expect(encrypted).not.toBe(plaintext)
    })

    it('should produce base64-encoded output', () => {
      const plaintext = 'test data'
      const encrypted = encrypt(plaintext, testPassphrase)

      // Base64 regex
      expect(encrypted).toMatch(/^[A-Za-z0-9+/]+=*$/)
    })

    it('should produce consistent output for the same input and key', () => {
      const plaintext = 'deterministic test'
      const encrypted1 = encrypt(plaintext, testPassphrase)
      const encrypted2 = encrypt(plaintext, testPassphrase)

      // AES-CBC with derived IV from same key should produce same result
      expect(encrypted1).toBe(encrypted2)
    })

    it('should fail to decrypt with wrong key', () => {
      const plaintext = 'secret data'
      const encrypted = encrypt(plaintext, testPassphrase)

      expect(() => decrypt(encrypted, 'wrong-key')).toThrow()
    })

    it('should handle empty string', () => {
      const plaintext = ''
      const encrypted = encrypt(plaintext, testPassphrase)
      const decrypted = decrypt(encrypted, testPassphrase)

      expect(decrypted).toBe(plaintext)
    })

    it('should handle unicode characters', () => {
      const plaintext = 'Pago de condominio: Bs. 1.500,00 — Unidad 2B'
      const encrypted = encrypt(plaintext, testPassphrase)
      const decrypted = decrypt(encrypted, testPassphrase)

      expect(decrypted).toBe(plaintext)
    })

    it('should handle large payloads', () => {
      const payload = JSON.stringify({
        data: 'x'.repeat(10000),
        nested: { a: 1, b: 2, c: [1, 2, 3] },
      })

      const encrypted = encrypt(payload, testPassphrase)
      const decrypted = decrypt(encrypted, testPassphrase)

      expect(decrypted).toBe(payload)
    })
  })

  describe('sha256Hash', () => {
    it('should produce a 64-character hex string', () => {
      const hash = sha256Hash('test data')

      expect(hash).toHaveLength(64)
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should produce consistent hashes for the same input', () => {
      const hash1 = sha256Hash('test data')
      const hash2 = sha256Hash('test data')

      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different input', () => {
      const hash1 = sha256Hash('data 1')
      const hash2 = sha256Hash('data 2')

      expect(hash1).not.toBe(hash2)
    })

    it('should handle the BNC validation field pattern (GUID + Reference + Value)', () => {
      const clientGUID = '12345678-1234-1234-1234-123456789012'
      const reference = '20260320-143000-abcd1234'
      const encryptedValue = encrypt('{"Amount": 100}', testPassphrase)

      const hash = sha256Hash(clientGUID + reference + encryptedValue)

      expect(hash).toHaveLength(64)
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })
  })

  describe('generateReference', () => {
    it('should generate a non-empty string', () => {
      const ref = generateReference()

      expect(ref).toBeTruthy()
      expect(ref.length).toBeGreaterThan(0)
    })

    it('should contain a date-like prefix', () => {
      const ref = generateReference()

      // Format: YYYYMMDDHHMMSS-RANDOM
      expect(ref).toMatch(/^\d{14}-[a-f0-9]{8}$/)
    })

    it('should generate unique references', () => {
      const refs = new Set<string>()

      for (let i = 0; i < 100; i++) {
        refs.add(generateReference())
      }

      // All should be unique (random suffix)
      expect(refs.size).toBe(100)
    })
  })
})
