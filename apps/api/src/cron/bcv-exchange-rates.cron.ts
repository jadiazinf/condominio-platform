import { DatabaseService } from '@database/service'
import { SyncBcvRatesService } from '@services/exchange-rates'
import { UserRolesRepository } from '@database/repositories'
import { EmailService } from '@services/email'
import logger from '@utils/logger'

const SIX_HOURS_MS = 6 * 60 * 60 * 1000
const MAX_RETRIES = 3
const RETRY_DELAYS_MS = [5_000, 15_000, 45_000] // 5s, 15s, 45s

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function runSync(): Promise<void> {
  const start = Date.now()

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const db = DatabaseService.getInstance().getDb()
      const service = new SyncBcvRatesService(db)
      await service.execute()

      const elapsed = ((Date.now() - start) / 1000).toFixed(1)
      logger.info({ elapsedSeconds: elapsed }, '[BCV Cron] BCV exchange rates sync completed')
      return
    } catch (error) {
      const isLastAttempt = attempt === MAX_RETRIES

      logger.warn(
        { error, attempt, maxRetries: MAX_RETRIES },
        `[BCV Cron] Sync attempt ${attempt}/${MAX_RETRIES} failed`
      )

      if (isLastAttempt) {
        logger.error({ error }, '[BCV Cron] All retry attempts exhausted')
        await notifySuperadmins(error)
        return
      }

      const delay = RETRY_DELAYS_MS[attempt - 1]!
      logger.info({ delayMs: delay }, `[BCV Cron] Retrying in ${delay / 1000}s...`)
      await sleep(delay)
    }
  }
}

async function notifySuperadmins(error: unknown): Promise<void> {
  try {
    const db = DatabaseService.getInstance().getDb()
    const userRolesRepo = new UserRolesRepository(db)
    const superadmins = await userRolesRepo.getActiveSuperadminUsers()

    if (superadmins.length === 0) {
      logger.warn('[BCV Cron] No active superadmins found to notify')
      return
    }

    const emails = superadmins.map(u => u.email)
    const errorMessage = error instanceof Error ? error.message : String(error)
    const timestamp = new Date().toLocaleString('es-VE', { timeZone: 'America/Caracas' })

    const emailService = EmailService.getInstance()
    await emailService.execute({
      to: emails,
      subject: '[CondominioApp] Fallo en sincronización de tasas BCV',
      html: `
        <h2>Fallo en sincronización de tasas de cambio BCV</h2>
        <p>El servicio de sincronización de tasas de cambio del BCV falló después de <strong>${MAX_RETRIES} intentos</strong>.</p>
        <p><strong>Fecha:</strong> ${timestamp}</p>
        <p><strong>Error:</strong></p>
        <pre style="background:#f4f4f4;padding:12px;border-radius:4px;">${errorMessage}</pre>
        <p>El sistema reintentará automáticamente en 6 horas. Si el problema persiste, revise la conectividad con <a href="https://www.bcv.org.ve/">bcv.org.ve</a> o los logs del servidor.</p>
      `,
    })

    logger.info({ recipients: emails }, '[BCV Cron] Superadmins notified of sync failure')
  } catch (notifyError) {
    logger.error({ notifyError }, '[BCV Cron] Failed to notify superadmins')
  }
}

export function startBcvExchangeRatesCron(): void {
  logger.info('[BCV Cron] Starting BCV exchange rates cron (every 6 hours)')

  // Run immediately on startup to populate data
  runSync()

  // Then run every 6 hours
  setInterval(runSync, SIX_HOURS_MS)
}
