import { env } from '@config/environment'
import logger from '@utils/logger'
import type { IService, TServiceResult } from '../base.service'
import { success, failure } from '../base.service'
import { EmailService } from './email.service'

export interface ISendSubscriptionAcceptanceEmailInput {
  to: string
  recipientName: string
  companyName: string
  subscriptionName: string
  basePrice: number
  billingCycle: string
  startDate: Date
  pricingDetails?: {
    condominiumCount: number | null
    unitCount: number | null
    condominiumRate: number | null
    unitRate: number | null
    calculatedPrice: number | null
    discountType: string | null
    discountValue: number | null
    discountAmount: number | null
  }
  termsContent: string
  termsVersion: string
  acceptanceToken: string
  expiresAt: Date
}

export interface ISendSubscriptionAcceptanceEmailResult {
  emailId: string
}

/**
 * Service for sending subscription acceptance emails.
 * Includes subscription details, pricing breakdown, and terms & conditions.
 */
export class SendSubscriptionAcceptanceEmailService
  implements IService<ISendSubscriptionAcceptanceEmailInput, TServiceResult<ISendSubscriptionAcceptanceEmailResult>>
{
  constructor(private readonly emailService: EmailService = new EmailService()) {}

  async execute(
    input: ISendSubscriptionAcceptanceEmailInput
  ): Promise<TServiceResult<ISendSubscriptionAcceptanceEmailResult>> {
    const {
      to,
      recipientName,
      companyName,
      subscriptionName,
      basePrice,
      billingCycle,
      startDate,
      pricingDetails,
      termsContent,
      termsVersion,
      acceptanceToken,
      expiresAt,
    } = input

    const acceptanceLink = `${env.APP_URL}/accept-subscription?token=${acceptanceToken}`
    const expiresAtFormatted = expiresAt.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const startDateFormatted = startDate.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const subject = `Confirmación de suscripción para ${companyName}`

    const html = this.generateEmailHtml({
      recipientName,
      companyName,
      subscriptionName,
      basePrice,
      billingCycle: this.translateBillingCycle(billingCycle),
      startDate: startDateFormatted,
      pricingDetails,
      termsContent,
      termsVersion,
      acceptanceLink,
      expiresAtFormatted,
    })

    const text = this.generateEmailText({
      recipientName,
      companyName,
      subscriptionName,
      basePrice,
      billingCycle: this.translateBillingCycle(billingCycle),
      startDate: startDateFormatted,
      termsContent,
      termsVersion,
      acceptanceLink,
      expiresAtFormatted,
    })

    logger.info({ to, companyName, expiresAt: expiresAtFormatted }, 'Sending subscription acceptance email')

    const result = await this.emailService.execute({
      to,
      subject,
      html,
      text,
    })

    if (!result.success) {
      return failure(result.error, result.code)
    }

    return success({ emailId: result.data.id })
  }

  private translateBillingCycle(cycle: string): string {
    const translations: Record<string, string> = {
      monthly: 'Mensual',
      quarterly: 'Trimestral',
      semi_annual: 'Semestral',
      annual: 'Anual',
      custom: 'Personalizado',
    }
    return translations[cycle] || cycle
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  private generatePricingBreakdownHtml(details: ISendSubscriptionAcceptanceEmailInput['pricingDetails']): string {
    if (!details) return ''

    let html = `
      <div style="background-color: #f4f4f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin: 0 0 15px; font-size: 16px; color: #18181b;">Desglose del precio:</h3>
        <table style="width: 100%; border-collapse: collapse;">
    `

    if (details.condominiumCount && details.condominiumRate) {
      html += `
        <tr>
          <td style="padding: 8px 0; color: #3f3f46;">${details.condominiumCount} condominios × ${this.formatCurrency(details.condominiumRate)}</td>
          <td style="padding: 8px 0; text-align: right; color: #3f3f46;">${this.formatCurrency(details.condominiumCount * details.condominiumRate)}</td>
        </tr>
      `
    }

    if (details.unitCount && details.unitRate) {
      html += `
        <tr>
          <td style="padding: 8px 0; color: #3f3f46;">${details.unitCount} unidades × ${this.formatCurrency(details.unitRate)}</td>
          <td style="padding: 8px 0; text-align: right; color: #3f3f46;">${this.formatCurrency(details.unitCount * details.unitRate)}</td>
        </tr>
      `
    }

    if (details.calculatedPrice) {
      html += `
        <tr style="border-top: 1px solid #e4e4e7;">
          <td style="padding: 12px 0 8px; font-weight: 600; color: #18181b;">Subtotal</td>
          <td style="padding: 12px 0 8px; text-align: right; font-weight: 600; color: #18181b;">${this.formatCurrency(details.calculatedPrice)}</td>
        </tr>
      `
    }

    if (details.discountAmount && details.discountAmount > 0) {
      const discountLabel = details.discountType === 'percentage'
        ? `Descuento (${details.discountValue}%)`
        : 'Descuento'
      html += `
        <tr>
          <td style="padding: 8px 0; color: #22c55e;">${discountLabel}</td>
          <td style="padding: 8px 0; text-align: right; color: #22c55e;">-${this.formatCurrency(details.discountAmount)}</td>
        </tr>
      `
    }

    html += `
        </table>
      </div>
    `

    return html
  }

  private generateEmailHtml(params: {
    recipientName: string
    companyName: string
    subscriptionName: string
    basePrice: number
    billingCycle: string
    startDate: string
    pricingDetails?: ISendSubscriptionAcceptanceEmailInput['pricingDetails']
    termsContent: string
    termsVersion: string
    acceptanceLink: string
    expiresAtFormatted: string
  }): string {
    const {
      recipientName,
      companyName,
      subscriptionName,
      basePrice,
      billingCycle,
      startDate,
      pricingDetails,
      termsContent,
      termsVersion,
      acceptanceLink,
      expiresAtFormatted,
    } = params

    const pricingBreakdown = this.generatePricingBreakdownHtml(pricingDetails)

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de suscripción - ${companyName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-width: 100%; background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 700px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              <div style="width: 64px; height: 64px; background-color: #006FEE; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 28px; font-weight: bold;">C</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #18181b;">
                Confirmación de Suscripción
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
                Hola <strong>${recipientName}</strong>,
              </p>

              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
                Se ha creado una nueva suscripción para <strong style="color: #006FEE;">${companyName}</strong>. Por favor revisa los detalles a continuación y acepta los términos y condiciones para activar la suscripción.
              </p>

              <!-- Subscription Details -->
              <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px; font-size: 18px; color: #1e40af;">Detalles de la suscripción</h3>
                <table style="width: 100%;">
                  <tr>
                    <td style="padding: 8px 0; color: #3f3f46; font-weight: 500;">Plan:</td>
                    <td style="padding: 8px 0; color: #18181b;">${subscriptionName || 'Plan personalizado'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #3f3f46; font-weight: 500;">Precio:</td>
                    <td style="padding: 8px 0; color: #18181b; font-weight: 600;">${this.formatCurrency(basePrice)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #3f3f46; font-weight: 500;">Ciclo de facturación:</td>
                    <td style="padding: 8px 0; color: #18181b;">${billingCycle}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #3f3f46; font-weight: 500;">Fecha de inicio:</td>
                    <td style="padding: 8px 0; color: #18181b;">${startDate}</td>
                  </tr>
                </table>
              </div>

              ${pricingBreakdown}

              <!-- Terms & Conditions -->
              <div style="margin: 30px 0;">
                <h3 style="margin: 0 0 15px; font-size: 18px; color: #18181b;">Términos y Condiciones (v${termsVersion})</h3>
                <div style="background-color: #fafafa; border: 1px solid #e4e4e7; padding: 20px; border-radius: 8px; max-height: 300px; overflow-y: auto; font-size: 14px; line-height: 1.6; color: #3f3f46;">
                  ${termsContent.replace(/\n/g, '<br>')}
                </div>
              </div>

              <p style="margin: 30px 0 20px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
                Al hacer clic en el botón a continuación, confirmas que has leído y aceptas los términos y condiciones de la suscripción.
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <a href="${acceptanceLink}"
                       style="display: inline-block; padding: 16px 32px; background-color: #22c55e; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 2px 4px rgba(34, 197, 94, 0.3);">
                      Aceptar y activar suscripción
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiration Notice -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 30px;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  <strong>Importante:</strong> Esta invitación expira el ${expiresAtFormatted}. Si no aceptas antes de esa fecha, la suscripción no será activada.
                </p>
              </div>

              <!-- Alternative Link -->
              <p style="margin: 0 0 10px; font-size: 14px; color: #71717a;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:
              </p>
              <p style="margin: 0; font-size: 12px; word-break: break-all;">
                <a href="${acceptanceLink}" style="color: #006FEE;">${acceptanceLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #fafafa; border-radius: 0 0 12px 12px; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0 0 10px; font-size: 12px; color: #71717a; text-align: center;">
                Si no solicitaste esta suscripción, puedes ignorar este correo.
              </p>
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                © ${new Date().getFullYear()} Condominio App. Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
  }

  private generateEmailText(params: {
    recipientName: string
    companyName: string
    subscriptionName: string
    basePrice: number
    billingCycle: string
    startDate: string
    termsContent: string
    termsVersion: string
    acceptanceLink: string
    expiresAtFormatted: string
  }): string {
    const {
      recipientName,
      companyName,
      subscriptionName,
      basePrice,
      billingCycle,
      startDate,
      termsContent,
      termsVersion,
      acceptanceLink,
      expiresAtFormatted,
    } = params

    return `
CONFIRMACIÓN DE SUSCRIPCIÓN

Hola ${recipientName},

Se ha creado una nueva suscripción para ${companyName}. Por favor revisa los detalles a continuación.

DETALLES DE LA SUSCRIPCIÓN
--------------------------
Plan: ${subscriptionName || 'Plan personalizado'}
Precio: ${this.formatCurrency(basePrice)}
Ciclo de facturación: ${billingCycle}
Fecha de inicio: ${startDate}

TÉRMINOS Y CONDICIONES (v${termsVersion})
--------------------------
${termsContent}

--------------------------

Para aceptar los términos y condiciones y activar la suscripción, visita el siguiente enlace:

${acceptanceLink}

IMPORTANTE: Esta invitación expira el ${expiresAtFormatted}. Si no aceptas antes de esa fecha, la suscripción no será activada.

Si no solicitaste esta suscripción, puedes ignorar este correo.

---
© ${new Date().getFullYear()} Condominio App. Todos los derechos reservados.
`.trim()
  }
}
