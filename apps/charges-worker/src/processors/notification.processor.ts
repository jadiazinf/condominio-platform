import type PgBoss from 'pg-boss'
import { Resend } from 'resend'
import { DatabaseService } from '@database/service'
import {
  NotificationsRepository,
  NotificationDeliveriesRepository,
  UserNotificationPreferencesRepository,
  UserFcmTokensRepository,
  UsersRepository,
  CondominiumsRepository,
  ManagementCompaniesRepository,
} from '@database/repositories'
import { SendNotificationService, SendFcmNotificationService } from '@packages/services'
import { admin } from '@worker/libs/firebase/config'
import type { INotifyJobData } from '@worker/boss/queues'
import logger from '@packages/logger'

let resendClient: Resend | null = null

function getResendClient(): Resend | null {
  if (resendClient) return resendClient
  const apiKey = process.env.RESEND_API_KEY || Bun.env.RESEND_API_KEY
  if (!apiKey) return null
  resendClient = new Resend(apiKey)
  return resendClient
}

export async function processNotification(job: PgBoss.Job<INotifyJobData>): Promise<void> {
  const { userId, category, title, body, data, channels } = job.data

  logger.info({ jobId: job.id, userId, category }, '[Notify] Processing notification')

  try {
    const db = DatabaseService.getInstance().getDb()
    const notificationsRepo = new NotificationsRepository(db)
    const deliveriesRepo = new NotificationDeliveriesRepository(db)
    const preferencesRepo = new UserNotificationPreferencesRepository(db)
    const fcmTokensRepo = new UserFcmTokensRepository(db)

    // Idempotency check: skip if this job was already processed (e.g., pg-boss retry)
    const alreadySent = await notificationsRepo.existsByJobId(job.id)
    if (alreadySent) {
      logger.info(
        { jobId: job.id },
        '[Notify] Notification already sent for this job, skipping (idempotent)'
      )
      return
    }

    const fcmService = new SendFcmNotificationService(fcmTokensRepo, admin.messaging())

    const service = new SendNotificationService(
      notificationsRepo,
      deliveriesRepo,
      preferencesRepo,
      fcmService
    )

    const result = await service.execute({
      userId,
      category,
      title,
      body,
      data,
      channels: channels ?? ['in_app', 'push'],
      priority: category === 'alert' ? 'high' : 'normal',
      metadata: { jobId: job.id },
    })

    if (!result.success) {
      throw new Error(`Notification send failed: ${result.error}`)
    }

    logger.info(
      { notificationId: result.data.notification.id, deliveries: result.data.deliveryIds.length },
      '[Notify] Notification sent successfully'
    )

    // Broadcast via WebSocket (call API server's internal endpoint)
    await broadcastNotificationViaApi(userId, result.data.notification.id)

    // Send actual email if email channel was requested and delivery was created as 'pending'
    const requestedChannels = channels ?? ['in_app', 'push']
    if (requestedChannels.includes('email')) {
      await sendEmail(
        db,
        userId,
        title,
        body,
        category,
        data,
        result.data.notification.id,
        deliveriesRepo
      )
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error({ userId, error: msg }, '[Notify] Failed to send notification')
    // Re-throw so pg-boss retries the job
    throw error
  }
}

async function sendEmail(
  db: ReturnType<typeof DatabaseService.prototype.getDb>,
  userId: string,
  subject: string,
  body: string,
  category: string,
  data: Record<string, unknown> | undefined,
  notificationId: string,
  deliveriesRepo: NotificationDeliveriesRepository
): Promise<void> {
  try {
    // Get user email
    const usersRepo = new UsersRepository(db)
    const user = await usersRepo.getById(userId)

    if (!user?.email) {
      logger.warn({ userId }, '[Notify] User has no email, skipping email delivery')
      return
    }

    const resend = getResendClient()
    if (!resend) {
      const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'
      if (isDev) {
        logger.warn(
          { userId, subject },
          '[Notify] Resend not configured (dev mode), skipping email'
        )
      } else {
        logger.error('[Notify] RESEND_API_KEY not configured, cannot send emails')
      }
      return
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Condominio App <noreply@resend.dev>'

    // Fetch management company info if condominiumId is available
    let managementCompanyInfo: IManagementCompanyContact | undefined
    const condominiumId = data?.condominiumId as string | undefined
    if (condominiumId) {
      try {
        const condominiumsRepo = new CondominiumsRepository(db)
        const condominium = await condominiumsRepo.getById(condominiumId)
        if (condominium && condominium.managementCompanyIds.length > 0) {
          const mcRepo = new ManagementCompaniesRepository(db)
          const mc = await mcRepo.getById(condominium.managementCompanyIds[0]!)
          if (mc && mc.email) {
            managementCompanyInfo = {
              name: mc.name,
              email: mc.email,
              phone: mc.phone ?? undefined,
              phoneCountryCode: mc.phoneCountryCode ?? undefined,
              address: mc.address ?? undefined,
            }
          }
        }
      } catch (mcError) {
        logger.warn(
          { condominiumId, error: mcError },
          '[Notify] Failed to fetch management company info'
        )
      }
    }

    // Build styled HTML email
    const htmlBody = buildNotificationEmailHtml({
      subject: escapeHtml(subject),
      body: escapeHtml(body),
      userName: user.displayName || user.email.split('@')[0] || '',
      category,
      data,
      managementCompany: managementCompanyInfo,
    })

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: [user.email],
      subject,
      html: htmlBody,
      text: body,
    })

    if (emailError) {
      logger.error(
        { error: emailError.message, userId, email: user.email },
        '[Notify] Failed to send email via Resend'
      )

      // Update delivery status to failed
      const delivery = await deliveriesRepo.getByNotificationAndChannel(notificationId, 'email')
      if (delivery) {
        await deliveriesRepo.markAsFailed(delivery.id, emailError.message)
      }
      return
    }

    // Update delivery status to delivered
    const delivery = await deliveriesRepo.getByNotificationAndChannel(notificationId, 'email')
    if (delivery) {
      await deliveriesRepo.markAsDelivered(delivery.id)
    }

    logger.info(
      { emailId: emailData?.id, userId, email: user.email },
      '[Notify] Email sent successfully'
    )
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error({ userId, error: msg }, '[Notify] Error sending email')
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ─────────────────────────────────────────────────────────────────────────────
// Email template
// ─────────────────────────────────────────────────────────────────────────────

interface IManagementCompanyContact {
  name: string
  email: string
  phone?: string
  phoneCountryCode?: string
  address?: string
}

interface IEmailTemplateInput {
  subject: string
  body: string
  userName: string
  category: string
  data?: Record<string, unknown>
  managementCompany?: IManagementCompanyContact
}

const CATEGORY_CONFIG: Record<string, { color: string; label: string; accentLight: string }> = {
  quota: { color: '#059669', label: 'Cuota', accentLight: '#ecfdf5' },
  alert: { color: '#d97706', label: 'Alerta', accentLight: '#fffbeb' },
  payment: { color: '#2563eb', label: 'Pago', accentLight: '#eff6ff' },
  announcement: { color: '#7c3aed', label: 'Anuncio', accentLight: '#f5f3ff' },
  reminder: { color: '#db2777', label: 'Recordatorio', accentLight: '#fdf2f8' },
  system: { color: '#4b5563', label: 'Sistema', accentLight: '#f9fafb' },
}

function buildNotificationEmailHtml(input: IEmailTemplateInput): string {
  const config = CATEGORY_CONFIG[input.category] ?? CATEGORY_CONFIG.system!
  const year = new Date().getFullYear()
  const appUrl = process.env.APP_URL || 'https://app.condominioapp.com'

  // Extract structured data for enhanced display
  const conceptName = input.data?.conceptName as string | undefined
  const condominiumName = input.data?.condominiumName as string | undefined
  const totalAmount = input.data?.totalAmount as string | undefined
  const dueDate = input.data?.dueDate as string | undefined
  const quotasCreated = input.data?.quotasCreated as number | undefined
  const currencyCode = input.data?.currencyCode as string | undefined

  // Convert newlines in body to paragraphs
  const bodyParagraphs = input.body
    .split('\n')
    .filter(line => line.trim() !== '')
    .map(
      line =>
        `<p style="margin: 0 0 8px; font-size: 14px; line-height: 1.6; color: #374151;">${line}</p>`
    )
    .join('\n')

  // Build detail rows if structured data is available
  const hasDetails = conceptName || condominiumName || totalAmount || dueDate
  const detailRows = hasDetails
    ? buildDetailRows({
        conceptName,
        condominiumName,
        totalAmount,
        dueDate,
        quotasCreated,
        currencyCode,
      })
    : ''

  // Build management company contact block
  const mcBlock = input.managementCompany
    ? buildManagementCompanyBlock(input.managementCompany)
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${input.subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-width: 100%; background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <span style="font-size: 17px; font-weight: 700; color: #1e293b; letter-spacing: -0.3px;">Condominio App</span>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">

                <!-- Top accent line -->
                <tr>
                  <td style="height: 3px; background-color: ${config.color};"></td>
                </tr>

                <!-- Category label -->
                <tr>
                  <td style="padding: 20px 28px 0;">
                    <span style="display: inline-block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: ${config.color}; background-color: ${config.accentLight}; padding: 4px 10px; border-radius: 4px;">${config.label}</span>
                  </td>
                </tr>

                <!-- Subject -->
                <tr>
                  <td style="padding: 12px 28px 0;">
                    <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.35;">
                      ${input.subject}
                    </h1>
                  </td>
                </tr>

                <!-- Greeting -->
                <tr>
                  <td style="padding: 16px 28px 0;">
                    ${input.userName ? `<p style="margin: 0; font-size: 14px; color: #475569;">Hola <strong style="color: #1e293b;">${input.userName}</strong>,</p>` : ''}
                  </td>
                </tr>

                <!-- Body Content -->
                <tr>
                  <td style="padding: 12px 28px 0;">
                    ${bodyParagraphs}
                  </td>
                </tr>

                ${
                  detailRows
                    ? `
                <!-- Detail Card -->
                <tr>
                  <td style="padding: 16px 28px 0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                      ${detailRows}
                    </table>
                  </td>
                </tr>
                `
                    : ''
                }

                <!-- CTA Button -->
                <tr>
                  <td align="center" style="padding: 24px 28px;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="border-radius: 8px; background-color: ${config.color};">
                          <a href="${appUrl}/dashboard/my-quotas"
                             style="display: inline-block; padding: 12px 28px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; letter-spacing: 0.2px;">
                            Ver en la plataforma
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                ${mcBlock}

                <!-- Divider -->
                <tr>
                  <td style="padding: 0 28px;">
                    <div style="border-top: 1px solid #e2e8f0;"></div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 16px 28px 20px;">
                    <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                      Este es un mensaje autom&aacute;tico. No es necesario responder a este correo.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Copyright -->
          <tr>
            <td align="center" style="padding: 20px 0 0;">
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                &copy; ${year} Condominio App
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildDetailRows(details: {
  conceptName?: string
  condominiumName?: string
  totalAmount?: string
  dueDate?: string
  quotasCreated?: number
  currencyCode?: string
}): string {
  const rows: string[] = []

  if (details.condominiumName) {
    rows.push(buildDetailRow('Condominio', details.condominiumName))
  }
  if (details.conceptName) {
    rows.push(buildDetailRow('Concepto', details.conceptName))
  }
  if (details.totalAmount) {
    const amountDisplay = details.currencyCode
      ? `${escapeHtml(details.totalAmount)} ${escapeHtml(details.currencyCode)}`
      : escapeHtml(details.totalAmount)
    rows.push(buildDetailRow('Monto', `<strong style="color: #0f172a;">${amountDisplay}</strong>`))
  }
  if (details.dueDate) {
    rows.push(buildDetailRow('Vencimiento', details.dueDate))
  }
  if (details.quotasCreated != null && details.quotasCreated > 1) {
    rows.push(buildDetailRow('Cuotas generadas', String(details.quotasCreated)))
  }

  return rows.join('')
}

function buildDetailRow(label: string, value: string): string {
  return `
      <tr>
        <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="font-size: 13px; color: #64748b; width: 40%;">${label}</td>
              <td style="font-size: 13px; color: #1e293b; text-align: right;">${value}</td>
            </tr>
          </table>
        </td>
      </tr>`
}

async function broadcastNotificationViaApi(userId: string, notificationId: string): Promise<void> {
  const apiUrl = process.env.INTERNAL_API_URL
  const apiKey = process.env.INTERNAL_API_KEY
  if (!apiUrl || !apiKey) return

  try {
    const response = await fetch(`${apiUrl}/api/internal/broadcast-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-api-key': apiKey,
      },
      body: JSON.stringify({ userId, notificationId }),
    })

    if (!response.ok) {
      logger.warn(
        { status: response.status, userId, notificationId },
        '[Notify] Failed to broadcast notification via API'
      )
    }
  } catch (error) {
    // Non-critical: notification is already saved, just won't appear in real-time
    logger.warn({ error, userId }, '[Notify] Could not reach API for WebSocket broadcast')
  }
}

function buildManagementCompanyBlock(mc: IManagementCompanyContact): string {
  const phoneDisplay = mc.phone
    ? `${mc.phoneCountryCode ? `(${mc.phoneCountryCode}) ` : ''}${mc.phone}`
    : null

  const contactLines: string[] = []
  contactLines.push(
    `<strong style="color: #1e293b; font-size: 13px;">${escapeHtml(mc.name)}</strong>`
  )
  contactLines.push(`<span style="font-size: 12px; color: #475569;">${escapeHtml(mc.email)}</span>`)
  if (phoneDisplay) {
    contactLines.push(
      `<span style="font-size: 12px; color: #475569;">${escapeHtml(phoneDisplay)}</span>`
    )
  }
  if (mc.address) {
    contactLines.push(
      `<span style="font-size: 12px; color: #475569;">${escapeHtml(mc.address)}</span>`
    )
  }

  return `
                <!-- Management Company Contact -->
                <tr>
                  <td style="padding: 16px 28px 8px;">
                    <div style="border-top: 1px solid #e2e8f0; padding-top: 16px;">
                      <p style="margin: 0 0 8px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8;">Administradora</p>
                      <div style="line-height: 1.8;">
                        ${contactLines.join('<br>')}
                      </div>
                    </div>
                  </td>
                </tr>`
}
