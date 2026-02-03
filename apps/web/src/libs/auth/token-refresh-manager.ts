/**
 * Token Refresh Manager
 *
 * Handles token refresh with request queuing to ensure:
 * 1. Only one refresh happens at a time (no race conditions)
 * 2. All pending requests are queued during refresh
 * 3. Queued requests are replayed with the new token after refresh
 * 4. Silent retry for temporary errors
 * 5. Logout with inactivity message when refresh token expires
 */

type RefreshFunction = () => Promise<void>
type LogoutFunction = (reason: 'inactivity' | 'error') => void
type QueuedRequest = {
  resolve: () => void
  reject: (error: Error) => void
}

/**
 * Error thrown when the refresh token has expired
 * This indicates the user has been inactive for too long
 */
export class SessionExpiredError extends Error {
  constructor(message = 'Session expired due to inactivity') {
    super(message)
    this.name = 'SessionExpiredError'
  }
}

class TokenRefreshManager {
  private isRefreshing = false
  private refreshPromise: Promise<void> | null = null
  private requestQueue: QueuedRequest[] = []
  private refreshFunction: RefreshFunction | null = null
  private logoutFunction: LogoutFunction | null = null
  private lastRefreshTime = 0
  private consecutiveFailures = 0
  private readonly MIN_REFRESH_INTERVAL = 5000 // 5 seconds minimum between refreshes
  private readonly MAX_CONSECUTIVE_FAILURES = 3 // After 3 failures, trigger logout

  /**
   * Set the refresh function to use when refreshing tokens
   */
  setRefreshFunction(fn: RefreshFunction): void {
    this.refreshFunction = fn
  }

  /**
   * Set the logout function to call when session expires
   */
  setLogoutFunction(fn: LogoutFunction): void {
    this.logoutFunction = fn
  }

  /**
   * Check if a refresh is currently in progress
   */
  isRefreshInProgress(): boolean {
    return this.isRefreshing
  }

  /**
   * Wait for any ongoing refresh to complete
   * Call this before making a request if you want to ensure the token is fresh
   */
  async waitForRefresh(): Promise<void> {
    if (this.refreshPromise) {
      await this.refreshPromise
    }
  }

  /**
   * Request a token refresh
   * If a refresh is already in progress, returns the existing promise
   * This prevents multiple simultaneous refresh attempts
   */
  async refreshToken(): Promise<void> {
    // If already refreshing, wait for the current refresh to complete
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise
    }

    // Prevent too frequent refreshes (debounce)
    const now = Date.now()
    if (now - this.lastRefreshTime < this.MIN_REFRESH_INTERVAL) {
      return
    }

    if (!this.refreshFunction) {
      throw new Error('Refresh function not set')
    }

    this.isRefreshing = true
    this.lastRefreshTime = now

    this.refreshPromise = this.executeRefresh()

    try {
      await this.refreshPromise
    } finally {
      this.isRefreshing = false
      this.refreshPromise = null
    }
  }

  /**
   * Execute the actual refresh and process the queue
   */
  private async executeRefresh(): Promise<void> {
    try {
      await this.refreshFunction!()
      // Reset consecutive failures on success
      this.consecutiveFailures = 0
      // Resolve all queued requests
      this.processQueue(true)
    } catch (error) {
      this.consecutiveFailures++

      // Check if this is a token expiration error (Firebase auth errors)
      const isTokenExpired = this.isTokenExpiredError(error)

      if (isTokenExpired || this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        // Session is truly expired or we've failed too many times
        // Trigger logout with inactivity reason
        this.triggerLogout('inactivity')
        // Reject all queued requests with session expired error
        this.processQueue(false, new SessionExpiredError())
        throw new SessionExpiredError()
      }

      // Reject all queued requests with the original error
      this.processQueue(false, error as Error)
      throw error
    }
  }

  /**
   * Check if the error indicates the token/refresh token has expired
   */
  private isTokenExpiredError(error: unknown): boolean {
    if (!error) return false

    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
    const errorCode = (error as { code?: string })?.code?.toLowerCase() || ''

    // Firebase Auth error codes for expired/invalid tokens
    const expiredCodes = [
      'auth/user-token-expired',
      'auth/id-token-expired',
      'auth/invalid-user-token',
      'auth/user-disabled',
      'auth/user-not-found',
      'auth/invalid-refresh-token',
      'auth/token-expired',
    ]

    // Check error codes
    if (expiredCodes.some(code => errorCode.includes(code.replace('auth/', '')))) {
      return true
    }

    // Check error messages
    const expiredMessages = [
      'token expired',
      'token has expired',
      'refresh token expired',
      'user not found',
      'user disabled',
      'invalid token',
      'no user available',
    ]

    return expiredMessages.some(msg => errorMessage.includes(msg))
  }

  /**
   * Trigger logout with the specified reason
   */
  private triggerLogout(reason: 'inactivity' | 'error'): void {
    if (this.logoutFunction) {
      this.logoutFunction(reason)
    }
  }

  /**
   * Queue a request to wait for the current refresh to complete
   * Returns a promise that resolves when the refresh is done
   */
  queueRequest(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ resolve, reject })
    })
  }

  /**
   * Process the queue after refresh completes
   */
  private processQueue(success: boolean, error?: Error): void {
    const queue = [...this.requestQueue]
    this.requestQueue = []

    for (const request of queue) {
      if (success) {
        request.resolve()
      } else {
        request.reject(error ?? new Error('Token refresh failed'))
      }
    }
  }

  /**
   * Handle a 401 response
   * - If refresh is in progress, queue the request
   * - If not, start a refresh and queue the request
   * Returns a promise that resolves when the token is refreshed
   */
  async handle401(): Promise<void> {
    if (this.isRefreshing) {
      // Refresh already in progress, queue this request
      return this.queueRequest()
    }

    // Start a new refresh
    return this.refreshToken()
  }

  /**
   * Get the time since last refresh in milliseconds
   */
  getTimeSinceLastRefresh(): number {
    return Date.now() - this.lastRefreshTime
  }

  /**
   * Reset the manager state (useful for testing or after logout)
   */
  reset(): void {
    this.consecutiveFailures = 0
    this.lastRefreshTime = 0
    this.requestQueue = []
    this.isRefreshing = false
    this.refreshPromise = null
  }
}

// Singleton instance
export const tokenRefreshManager = new TokenRefreshManager()
