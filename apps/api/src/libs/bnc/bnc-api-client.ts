import logger from '@utils/logger'
import { encrypt, decrypt, sha256Hash, generateReference } from './encryption'
import { extractErrorCode, getBncError } from './error-codes'
import type {
  IBncConfig,
  IBncRequestEnvelope,
  IBncResponseEnvelope,
  IC2PRequest,
  IC2PResponse,
  IC2PReverseRequest,
  IVPOSRequest,
  IVPOSResponse,
  IAccountHistoryRequest,
  IAccountHistoryEntry,
  IBCVRatesResponse,
} from './types'

const REQUEST_TIMEOUT_MS = 30_000

/**
 * Custom error for BNC API failures.
 * Exposes the BNC error code, user-friendly message, and retry/reauth flags.
 */
export class BncApiError extends Error {
  constructor(
    message: string,
    public readonly bncCode: string,
    public readonly bncMessage: string,
    public readonly retryable: boolean,
    public readonly requiresReauth: boolean
  ) {
    super(message)
    this.name = 'BncApiError'
  }
}

/**
 * HTTP client for the BNC ESolutions API v2.1.
 *
 * Handles request envelope construction (AES encryption + SHA-256 validation),
 * response decryption, and error code mapping.
 *
 * All transactional endpoints require a WorkingKey obtained via `authenticate()`.
 * The `authenticate()` method uses the MasterKey from config.
 */
export class BncApiClient {
  private readonly _fetch: typeof fetch

  constructor(
    private readonly config: IBncConfig,
    fetchFn?: typeof fetch
  ) {
    this._fetch = fetchFn ?? globalThis.fetch
  }

  /**
   * Checks if the BNC API is reachable.
   * GET /api/welcome/home
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(`${this.config.baseUrl}/api/welcome/home`, {
        method: 'GET',
      })

      return response.ok
    } catch {
      return false
    }
  }

  /**
   * Authenticates with BNC to obtain a daily WorkingKey.
   * POST /api/Auth/LogOn
   *
   * Uses the MasterKey for encryption. The returned WorkingKey
   * is used for all subsequent API calls until midnight VE (UTC-4).
   */
  async authenticate(): Promise<string> {
    const payload = JSON.stringify({ ClientGUID: this.config.clientGUID })
    const envelope = this.buildEnvelope(payload, this.config.masterKey)

    const response = await this.fetchWithTimeout(`${this.config.baseUrl}/api/Auth/LogOn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
    })

    const data = (await response.json()) as IBncResponseEnvelope

    if (data.status !== 'OK') {
      const code = extractErrorCode(data.message)
      const errorInfo = getBncError(code)

      throw new BncApiError(
        `BNC authentication failed: ${data.message}`,
        code,
        errorInfo.message,
        errorInfo.retryable,
        errorInfo.requiresReauth ?? false
      )
    }

    // The WorkingKey is returned encrypted with the MasterKey
    const workingKey = decrypt(data.value, this.config.masterKey)

    logger.info('[BNC] Authentication successful, WorkingKey obtained')

    return workingKey
  }

  /**
   * Sends a C2P (Cobro a Persona / Pago Móvil) payment request.
   * POST /api/MobPayment/SendC2P
   */
  async sendC2P(request: IC2PRequest, workingKey: string): Promise<IC2PResponse> {
    return this.sendEncryptedRequest<IC2PResponse>('/api/MobPayment/SendC2P', request, workingKey)
  }

  /**
   * Reverses a C2P transaction.
   * POST /api/MobPayment/ReverseC2P
   */
  async reverseC2P(request: IC2PReverseRequest, workingKey: string): Promise<unknown> {
    return this.sendEncryptedRequest('/api/MobPayment/ReverseC2P', request, workingKey)
  }

  /**
   * Sends a VPOS (Virtual Point of Sale / card) payment request.
   * POST /api/Transaction/Send
   */
  async sendVPOS(request: IVPOSRequest, workingKey: string): Promise<IVPOSResponse> {
    return this.sendEncryptedRequest<IVPOSResponse>('/api/Transaction/Send', request, workingKey)
  }

  /**
   * Gets account transaction history by date range.
   * POST /api/Position/HistoryByDate
   *
   * Max range: 31 days.
   */
  async getAccountHistory(
    request: IAccountHistoryRequest,
    workingKey: string
  ): Promise<IAccountHistoryEntry[]> {
    return this.sendEncryptedRequest<IAccountHistoryEntry[]>(
      '/api/Position/HistoryByDate',
      request,
      workingKey
    )
  }

  /**
   * Gets current BCV (Banco Central de Venezuela) exchange rates.
   * POST /api/Services/BCVRates
   */
  async getBCVRates(workingKey: string): Promise<IBCVRatesResponse> {
    return this.sendEncryptedRequest<IBCVRatesResponse>('/api/Services/BCVRates', {}, workingKey)
  }

  /**
   * Sends an encrypted request to a BNC transactional endpoint.
   * Builds the request envelope, sends it, and decrypts the response.
   */
  private async sendEncryptedRequest<T>(
    path: string,
    payload: unknown,
    workingKey: string
  ): Promise<T> {
    const jsonPayload = JSON.stringify(payload)
    const envelope = this.buildEnvelope(jsonPayload, workingKey)

    logger.debug(`[BNC] Sending request to ${path}`)

    const response = await this.fetchWithTimeout(`${this.config.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
    })

    const data = (await response.json()) as IBncResponseEnvelope

    if (data.status !== 'OK') {
      const code = extractErrorCode(data.message)
      const errorInfo = getBncError(code)

      logger.warn(`[BNC] Request to ${path} failed: ${data.message}`)

      throw new BncApiError(
        `BNC request failed: ${data.message}`,
        code,
        errorInfo.message,
        errorInfo.retryable,
        errorInfo.requiresReauth ?? false
      )
    }

    const decryptedValue = decrypt(data.value, workingKey)

    return JSON.parse(decryptedValue) as T
  }

  /**
   * Builds the BNC request envelope with AES encryption and SHA-256 validation.
   */
  private buildEnvelope(jsonPayload: string, passphrase: string): IBncRequestEnvelope {
    const reference = generateReference()
    const encryptedValue = encrypt(jsonPayload, passphrase)
    const validation = sha256Hash(this.config.clientGUID + reference + encryptedValue)

    return {
      ClientGUID: this.config.clientGUID,
      Reference: reference,
      Value: encryptedValue,
      Validation: validation,
      swTestOperation: this.config.sandbox,
    }
  }

  /**
   * Wrapper around fetch with timeout support.
   * Venezuelan banking APIs can be slow — uses 30s timeout.
   */
  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      return await this._fetch(url, {
        ...options,
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timeoutId)
    }
  }
}
