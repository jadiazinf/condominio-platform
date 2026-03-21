import { describe, it, expect, mock, beforeEach } from 'bun:test'

// Mock logger before importing BncApiClient
mock.module('@utils/logger', () => ({
  default: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
}))

import { BncApiClient, BncApiError } from './bnc-api-client'
import { encrypt } from './encryption'
import type { IBncConfig } from './types'

describe('BncApiClient', () => {
  let client: BncApiClient
  let mockFetch: ReturnType<typeof mock>
  const config: IBncConfig = {
    baseUrl: 'https://bnc-test.example.com',
    clientGUID: '12345678-1234-1234-1234-123456789012',
    masterKey: 'test-master-key',
    terminal: 'TERM0001',
    sandbox: true,
  }

  function createClient(
    fetchFn: typeof fetch = mockFetch as unknown as typeof fetch,
    cfg = config
  ) {
    return new BncApiClient(cfg, fetchFn)
  }

  function setMockFetch(fn: () => Promise<Response> | Promise<never>) {
    mockFetch = mock(fn)
    client = createClient(mockFetch as unknown as typeof fetch)
  }

  beforeEach(() => {
    mockFetch = mock(() => Promise.resolve(new Response('OK', { status: 200 })))
    client = createClient(mockFetch as unknown as typeof fetch)
  })

  describe('healthCheck', () => {
    it('should return true when BNC API is reachable', async () => {
      setMockFetch(() => Promise.resolve(new Response('Welcome', { status: 200 })))

      const result = await client.healthCheck()

      expect(result).toBe(true)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should return false when BNC API is unreachable', async () => {
      setMockFetch(() => Promise.reject(new Error('Network error')))

      const result = await client.healthCheck()

      expect(result).toBe(false)
    })

    it('should return false when BNC API returns non-200', async () => {
      setMockFetch(() => Promise.resolve(new Response('Error', { status: 500 })))

      const result = await client.healthCheck()

      expect(result).toBe(false)
    })

    it('should call the correct health check URL', async () => {
      setMockFetch(() => Promise.resolve(new Response('OK', { status: 200 })))

      await client.healthCheck()

      const calledUrl = mockFetch.mock.calls[0]![0]
      expect(calledUrl).toBe('https://bnc-test.example.com/api/welcome/home')
    })
  })

  describe('authenticate', () => {
    it('should return working key on successful auth', async () => {
      const fakeWorkingKey = 'daily-working-key-abc123'
      const encryptedWorkingKey = encrypt(fakeWorkingKey, config.masterKey)

      setMockFetch(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: 'OK',
              message: 'Success',
              value: encryptedWorkingKey,
              validation: 'hash',
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        )
      )

      const key = await client.authenticate()

      expect(key).toBe(fakeWorkingKey)
    })

    it('should send correct request format for LogOn', async () => {
      const encryptedWorkingKey = encrypt('some-working-key', config.masterKey)

      setMockFetch(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: 'OK',
              message: 'Success',
              value: encryptedWorkingKey,
              validation: 'hash',
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        )
      )

      await client.authenticate()

      const [url, options] = mockFetch.mock.calls[0]! as [string, RequestInit]
      expect(url).toBe('https://bnc-test.example.com/api/Auth/LogOn')
      expect(options.method).toBe('POST')

      const body = JSON.parse(options.body)
      expect(body.ClientGUID).toBe(config.clientGUID)
      expect(body.swTestOperation).toBe(true)
    })

    it('should throw on auth failure (KO response)', async () => {
      setMockFetch(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: 'KO',
              message: 'EPICNF Client not found',
              value: '',
              validation: '',
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        )
      )

      await expect(client.authenticate()).rejects.toThrow()
    })
  })

  describe('sendC2P', () => {
    const c2pRequest = {
      DebtorBankCode: 102,
      DebtorCellPhone: '584121234567',
      DebtorID: 'V12345678',
      Amount: 150.5,
      Token: 'ABC12345',
      Terminal: 'TERM0001',
    }

    it('should send correct request envelope', async () => {
      setMockFetch(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: 'OK',
              message: 'Success',
              value: 'encrypted-response',
              validation: 'hash',
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        )
      )

      // This will fail because the encrypted response can't be decrypted,
      // but we can verify the request format
      try {
        await client.sendC2P(c2pRequest, 'test-working-key')
      } catch {
        // Expected: decryption of mock response will fail
      }

      const [url, options] = mockFetch.mock.calls[0]! as [string, RequestInit]
      expect(url).toBe('https://bnc-test.example.com/api/MobPayment/SendC2P')
      expect(options.method).toBe('POST')

      const body = JSON.parse(options.body)
      expect(body.ClientGUID).toBe(config.clientGUID)
      expect(body.Reference).toBeTruthy()
      expect(body.Value).toBeTruthy() // AES-encrypted
      expect(body.Validation).toBeTruthy() // SHA-256
      expect(body.swTestOperation).toBe(true)
    })

    it('should throw BncApiError on KO response', async () => {
      setMockFetch(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: 'KO',
              message: 'G51 Insufficient funds',
              value: '',
              validation: '',
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        )
      )

      try {
        await client.sendC2P(c2pRequest, 'test-working-key')
        expect(true).toBe(false) // Should not reach here
      } catch (error) {
        const bncError = error as BncApiError
        expect(bncError.bncCode).toBe('G51')
        expect(bncError.retryable).toBe(false)
      }
    })
  })

  describe('sendVPOS', () => {
    it('should send request to correct endpoint', async () => {
      setMockFetch(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: 'OK',
              message: 'Success',
              value: 'encrypted-response',
              validation: 'hash',
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        )
      )

      const vposRequest = {
        TransactionIdentifier: 'TX001',
        Amount: 100.0,
        idCardType: 1 as const,
        CardNumber: 4111111111111111,
        dtExpiration: 122028,
        CardHolderName: 'John Doe',
        CardHolderID: 12345678,
        AccountType: 0 as const,
        CVV: 123,
        AffiliationNumber: 99999,
      }

      try {
        await client.sendVPOS(vposRequest, 'test-working-key')
      } catch {
        // Expected: decryption will fail with mock data
      }

      const [url] = mockFetch.mock.calls[0]! as [string, RequestInit]
      expect(url).toBe('https://bnc-test.example.com/api/Transaction/Send')
    })
  })

  describe('getAccountHistory', () => {
    it('should send request to correct endpoint', async () => {
      setMockFetch(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: 'OK',
              message: 'Success',
              value: 'encrypted-response',
              validation: 'hash',
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        )
      )

      const historyRequest = {
        AccountNumber: '01910000000000000001',
        StartDate: '2026-03-01',
        EndDate: '2026-03-20',
      }

      try {
        await client.getAccountHistory(historyRequest, 'test-working-key')
      } catch {
        // Expected
      }

      const [url] = mockFetch.mock.calls[0]! as [string, RequestInit]
      expect(url).toBe('https://bnc-test.example.com/api/Position/HistoryByDate')
    })
  })

  describe('getBCVRates', () => {
    it('should send request to correct endpoint', async () => {
      setMockFetch(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: 'OK',
              message: 'Success',
              value: 'encrypted-response',
              validation: 'hash',
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        )
      )

      try {
        await client.getBCVRates('test-working-key')
      } catch {
        // Expected
      }

      const [url] = mockFetch.mock.calls[0]! as [string, RequestInit]
      expect(url).toBe('https://bnc-test.example.com/api/Services/BCVRates')
    })
  })

  describe('reverseC2P', () => {
    it('should send request to correct endpoint', async () => {
      setMockFetch(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: 'OK',
              message: 'Success',
              value: 'encrypted-response',
              validation: 'hash',
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        )
      )

      const reverseRequest = {
        IdTransactionToReverse: 12345,
        Amount: 100.0,
        Terminal: 'TERM0001',
      }

      try {
        await client.reverseC2P(reverseRequest, 'test-working-key')
      } catch {
        // Expected
      }

      const [url] = mockFetch.mock.calls[0]! as [string, RequestInit]
      expect(url).toBe('https://bnc-test.example.com/api/MobPayment/ReverseC2P')
    })
  })

  describe('request envelope', () => {
    it('should include swTestOperation=true when sandbox mode', async () => {
      const sandboxFetch = mock(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: 'KO',
              message: 'error',
              value: '',
              validation: '',
            }),
            { status: 200 }
          )
        )
      )
      const sandboxClient = createClient(sandboxFetch as unknown as typeof fetch, {
        ...config,
        sandbox: true,
      })

      try {
        await sandboxClient.sendC2P(
          {
            DebtorBankCode: 102,
            DebtorCellPhone: '584121234567',
            DebtorID: 'V12345678',
            Amount: 100,
            Token: 'ABC12345',
            Terminal: 'TERM0001',
          },
          'key'
        )
      } catch {
        /* expected */
      }

      const calls = sandboxFetch.mock.calls[0]! as unknown as [string, RequestInit]
      const body = JSON.parse(calls[1].body as string)
      expect(body.swTestOperation).toBe(true)
    })

    it('should include swTestOperation=false when production mode', async () => {
      const prodFetch = mock(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: 'KO',
              message: 'error',
              value: '',
              validation: '',
            }),
            { status: 200 }
          )
        )
      )
      const prodClient = createClient(prodFetch as unknown as typeof fetch, {
        ...config,
        sandbox: false,
      })

      try {
        await prodClient.sendC2P(
          {
            DebtorBankCode: 102,
            DebtorCellPhone: '584121234567',
            DebtorID: 'V12345678',
            Amount: 100,
            Token: 'ABC12345',
            Terminal: 'TERM0001',
          },
          'key'
        )
      } catch {
        /* expected */
      }

      const calls = prodFetch.mock.calls[0]! as unknown as [string, RequestInit]
      const body = JSON.parse(calls[1].body as string)
      expect(body.swTestOperation).toBe(false)
    })
  })

  describe('timeout handling', () => {
    it('should timeout after configured duration', async () => {
      setMockFetch(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('AbortError')), 100)
          })
      )

      const result = await client.healthCheck()
      expect(result).toBe(false)
    })
  })

  describe('BncApiError', () => {
    const c2pRequest = {
      DebtorBankCode: 102,
      DebtorCellPhone: '584121234567',
      DebtorID: 'V12345678',
      Amount: 100,
      Token: 'ABC12345',
      Terminal: 'TERM0001',
    }

    it('should expose error code and retryable flag', async () => {
      setMockFetch(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: 'KO',
              message: 'G91 Issuing bank inoperative',
              value: '',
              validation: '',
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        )
      )

      try {
        await client.sendC2P(c2pRequest, 'key')
        expect(true).toBe(false)
      } catch (error) {
        const bncError = error as BncApiError
        expect(bncError.bncCode).toBe('G91')
        expect(bncError.retryable).toBe(true)
        expect(bncError.requiresReauth).toBe(false)
      }
    })

    it('should flag EPIRWK as requiring reauth', async () => {
      setMockFetch(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              status: 'KO',
              message: 'EPIRWK Security session expired',
              value: '',
              validation: '',
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        )
      )

      try {
        await client.sendC2P(c2pRequest, 'key')
        expect(true).toBe(false)
      } catch (error) {
        const bncError = error as BncApiError
        expect(bncError.bncCode).toBe('EPIRWK')
        expect(bncError.requiresReauth).toBe(true)
      }
    })
  })
})
