import { env } from '@/config/env'

const MAX_RETRIES = 5
const INITIAL_DELAY_MS = 1000

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function tryApiConnection(): Promise<void> {
  const apiBaseUrl = env.get('NEXT_PUBLIC_API_BASE_URL')
  const timeout = env.get('NEXT_PUBLIC_API_TIMEOUT')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(`${apiBaseUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`status ${response.status}: ${response.statusText}`)
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

async function checkApiConnection(): Promise<void> {
  const apiBaseUrl = env.get('NEXT_PUBLIC_API_BASE_URL')
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await tryApiConnection()
      console.log(`✅ API connection successful: ${apiBaseUrl}`)
      return
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      const isLastAttempt = attempt === MAX_RETRIES

      if (isLastAttempt) {
        break
      }

      const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1)
      console.log(
        `⏳ API connection attempt ${attempt}/${MAX_RETRIES} failed. Retrying in ${delay}ms...`
      )
      await sleep(delay)
    }
  }

  throw new Error(
    `Failed to connect to API at ${apiBaseUrl} after ${MAX_RETRIES} attempts: ${lastError?.message}`
  )
}

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Validate environment variables
    env.init()
    console.log('✅ Environment variables validated')

    // Check API connection with retries
    await checkApiConnection()
  }
}
