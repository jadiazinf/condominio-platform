import logger from '@utils/logger'

/**
 * Manages the daily BNC WorkingKey lifecycle.
 *
 * The WorkingKey is obtained via LogOn and expires at midnight Venezuela time (UTC-4).
 * BNC may also force early expiration by returning EPIRWK, requiring re-authentication.
 *
 * Thread-safe: concurrent calls to getWorkingKey() share the same auth promise.
 */
export class WorkingKeyManager {
  private workingKey: string | null = null
  private expiresAt: Date | null = null
  private authPromise: Promise<string> | null = null

  constructor(private authenticateFn: () => Promise<string>) {}

  /**
   * Returns a valid WorkingKey, authenticating if necessary.
   * Concurrent callers share the same authentication request.
   */
  async getWorkingKey(): Promise<string> {
    if (this.workingKey && this.expiresAt && new Date() < this.expiresAt) {
      return this.workingKey
    }

    return this.refresh()
  }

  /**
   * Forces a re-authentication (e.g., after EPIRWK error).
   */
  async refresh(): Promise<string> {
    // If already authenticating, share the promise
    if (this.authPromise) {
      return this.authPromise
    }

    this.authPromise = this.doAuthenticate()

    try {
      const key = await this.authPromise

      return key
    } finally {
      this.authPromise = null
    }
  }

  /**
   * Invalidates the current key (e.g., after receiving EPIRWK).
   */
  invalidate(): void {
    this.workingKey = null
    this.expiresAt = null
  }

  /**
   * Returns whether a valid key is currently cached.
   */
  isValid(): boolean {
    return this.workingKey !== null && this.expiresAt !== null && new Date() < this.expiresAt
  }

  private async doAuthenticate(): Promise<string> {
    logger.info('[BNC] Authenticating to obtain WorkingKey...')

    const key = await this.authenticateFn()

    this.workingKey = key
    this.expiresAt = this.getMidnightVenezuela()

    logger.info(`[BNC] WorkingKey obtained, expires at ${this.expiresAt.toISOString()}`)

    return key
  }

  /**
   * Calculates midnight Venezuela time (UTC-4) for key expiry.
   * If we're already past midnight VE, returns next midnight.
   */
  private getMidnightVenezuela(): Date {
    const now = new Date()
    // Venezuela is UTC-4
    const veOffsetMs = -4 * 60 * 60 * 1000
    const veNow = new Date(now.getTime() + veOffsetMs)

    // Next midnight in VE time
    const veMidnight = new Date(veNow)
    veMidnight.setUTCHours(0, 0, 0, 0)
    veMidnight.setUTCDate(veMidnight.getUTCDate() + 1)

    // Convert back to UTC
    return new Date(veMidnight.getTime() - veOffsetMs)
  }
}
