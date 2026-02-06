import logger from '@utils/logger'
import type { IService, TServiceResult } from '../base.service'
import { success, failure } from '../base.service'
import { EmailService } from './email.service'

export interface ISendSubscriptionCancellationEmailInput {
  to: string | string[]
  recipientName: string
  companyName: string
  subscriptionName: string
  basePrice: number
  billingCycle: string
  cancelledByName: string
  cancellationReason?: string
  cancelledAt: Date
}

export interface ISendSubscriptionCancellationEmailResult {
  emailId: string
}

/**
 * Service for sending subscription cancellation notification emails.
 * Notifies superusers, company email, and primary administrators.
 */
export class SendSubscriptionCancellationEmailService
  implements IService<ISendSubscriptionCancellationEmailInput, TServiceResult<ISendSubscriptionCancellationEmailResult>>
{
  constructor(private readonly emailService: EmailService = new EmailService()) {}

  async execute(
    input: ISendSubscriptionCancellationEmailInput
  ): Promise<TServiceResult<ISendSubscriptionCancellationEmailResult>> {
    const {
      to,
      recipientName,
      companyName,
      subscriptionName,
      basePrice,
      billingCycle,
      cancelledByName,
      cancellationReason,
      cancelledAt,
    } = input

    const cancelledAtFormatted = cancelledAt.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    const subject = `Suscripción cancelada - ${companyName}`

    const html = this.generateEmailHtml({
      recipientName,
      companyName,
      subscriptionName,
      basePrice,
      billingCycle: this.translateBillingCycle(billingCycle),
      cancelledByName,
      cancellationReason,
      cancelledAtFormatted,
    })

    const text = this.generateEmailText({
      recipientName,
      companyName,
      subscriptionName,
      basePrice,
      billingCycle: this.translateBillingCycle(billingCycle),
      cancelledByName,
      cancellationReason,
      cancelledAtFormatted,
    })

    logger.info({ to, companyName, cancelledAt: cancelledAtFormatted }, 'Sending subscription cancellation email')

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

  private generateEmailHtml(params: {
    recipientName: string
    companyName: string
    subscriptionName: string
    basePrice: number
    billingCycle: string
    cancelledByName: string
    cancellationReason?: string
    cancelledAtFormatted: string
  }): string {
    const {
      recipientName,
      companyName,
      subscriptionName,
      basePrice,
      billingCycle,
      cancelledByName,
      cancellationReason,
      cancelledAtFormatted,
    } = params

    const reasonHtml = cancellationReason
      ? `
        <tr>
          <td style="padding: 8px 0; color: #3f3f46; font-weight: 500;">Motivo:</td>
          <td style="padding: 8px 0; color: #18181b;">${cancellationReason}</td>
        </tr>
      `
      : ''

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Suscripción cancelada - ${companyName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-width: 100%; background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              <div style="width: 64px; height: 64px; background-color: #ef4444; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 28px; font-weight: bold;">!</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #18181b;">
                Suscripción Cancelada
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
                Te informamos que la suscripción de <strong style="color: #ef4444;">${companyName}</strong> ha sido cancelada.
              </p>

              <!-- Cancellation Alert -->
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; padding: 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px; color: #991b1b;">
                  <strong>Acción realizada:</strong> La suscripción ha sido cancelada y no se renovará automáticamente.
                </p>
              </div>

              <!-- Subscription Details -->
              <div style="background-color: #f4f4f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px; font-size: 18px; color: #18181b;">Detalles de la suscripción cancelada</h3>
                <table style="width: 100%;">
                  <tr>
                    <td style="padding: 8px 0; color: #3f3f46; font-weight: 500;">Plan:</td>
                    <td style="padding: 8px 0; color: #18181b;">${subscriptionName || 'Plan personalizado'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #3f3f46; font-weight: 500;">Precio:</td>
                    <td style="padding: 8px 0; color: #18181b;">${this.formatCurrency(basePrice)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #3f3f46; font-weight: 500;">Ciclo de facturación:</td>
                    <td style="padding: 8px 0; color: #18181b;">${billingCycle}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #3f3f46; font-weight: 500;">Cancelada por:</td>
                    <td style="padding: 8px 0; color: #18181b;">${cancelledByName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #3f3f46; font-weight: 500;">Fecha de cancelación:</td>
                    <td style="padding: 8px 0; color: #18181b;">${cancelledAtFormatted}</td>
                  </tr>
                  ${reasonHtml}
                </table>
              </div>

              <p style="margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #71717a;">
                Si tienes alguna pregunta sobre esta cancelación o necesitas reactivar la suscripción, por favor contacta al equipo de soporte.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #fafafa; border-radius: 0 0 12px 12px; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0 0 10px; font-size: 12px; color: #71717a; text-align: center;">
                Este es un correo automático de notificación. Por favor no respondas a este mensaje.
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
    cancelledByName: string
    cancellationReason?: string
    cancelledAtFormatted: string
  }): string {
    const {
      recipientName,
      companyName,
      subscriptionName,
      basePrice,
      billingCycle,
      cancelledByName,
      cancellationReason,
      cancelledAtFormatted,
    } = params

    const reasonText = cancellationReason ? `Motivo: ${cancellationReason}\n` : ''

    return `
SUSCRIPCIÓN CANCELADA

Hola ${recipientName},

Te informamos que la suscripción de ${companyName} ha sido cancelada.

DETALLES DE LA SUSCRIPCIÓN CANCELADA
------------------------------------
Plan: ${subscriptionName || 'Plan personalizado'}
Precio: ${this.formatCurrency(basePrice)}
Ciclo de facturación: ${billingCycle}
Cancelada por: ${cancelledByName}
Fecha de cancelación: ${cancelledAtFormatted}
${reasonText}
------------------------------------

Si tienes alguna pregunta sobre esta cancelación o necesitas reactivar la suscripción, por favor contacta al equipo de soporte.

Este es un correo automático de notificación. Por favor no respondas a este mensaje.

---
© ${new Date().getFullYear()} Condominio App. Todos los derechos reservados.
`.trim()
  }
}
