import { env } from '@config/environment'
import logger from '@utils/logger'
import type { IService, TServiceResult } from '../base.service'
import { success, failure } from '../base.service'
import { EmailService } from './email.service'

export interface ISendAccessRequestApprovedEmailInput {
  to: string
  recipientName: string
  condominiumName: string
  buildingName: string
  unitNumber: string
}

export interface ISendAccessRequestApprovedEmailResult {
  emailId: string
}

/**
 * Service for sending email notifications when an access request is approved.
 */
export class SendAccessRequestApprovedEmailService
  implements IService<ISendAccessRequestApprovedEmailInput, TServiceResult<ISendAccessRequestApprovedEmailResult>>
{
  constructor(private readonly emailService: EmailService = EmailService.getInstance()) {}

  async execute(
    input: ISendAccessRequestApprovedEmailInput
  ): Promise<TServiceResult<ISendAccessRequestApprovedEmailResult>> {
    const { to, recipientName, condominiumName, buildingName, unitNumber } = input

    const dashboardLink = `${env.APP_URL}/api/refresh-session`

    const subject = 'Tu solicitud de acceso ha sido aprobada'

    const html = this.generateEmailHtml({
      recipientName,
      condominiumName,
      buildingName,
      unitNumber,
      dashboardLink,
    })

    const text = this.generateEmailText({
      recipientName,
      condominiumName,
      buildingName,
      unitNumber,
      dashboardLink,
    })

    logger.info({ to, condominiumName, unitNumber }, 'Sending access request approved email')

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

  private generateEmailHtml(params: {
    recipientName: string
    condominiumName: string
    buildingName: string
    unitNumber: string
    dashboardLink: string
  }): string {
    const { recipientName, condominiumName, buildingName, unitNumber, dashboardLink } = params

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Solicitud de acceso aprobada</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-width: 100%; background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              <div style="width: 64px; height: 64px; background-color: #16a34a; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 28px; font-weight: bold;">✓</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #18181b;">
                Solicitud aprobada
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
                Tu solicitud de acceso al condominio ha sido <strong style="color: #16a34a;">aprobada</strong>. Ya puedes acceder a tu unidad y a todas las funciones del condominio.
              </p>

              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #71717a;">
                Haz clic en el botón de abajo para acceder a tu dashboard con la información actualizada. Si ya tienes la app abierta, cierra sesión e inicia sesión nuevamente para ver los cambios.
              </p>

              <!-- Info Card -->
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding-bottom: 16px;">
                      <span style="font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Condominio</span>
                      <p style="margin: 4px 0 0; font-size: 16px; font-weight: 600; color: #18181b;">${condominiumName}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 12px; border-top: 1px solid #bbf7d0;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="width: 50%; padding-top: 12px;">
                            <span style="font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Edificio</span>
                            <p style="margin: 4px 0 0; font-size: 14px; color: #3f3f46; font-weight: 500;">${buildingName}</p>
                          </td>
                          <td style="width: 50%; padding-top: 12px;">
                            <span style="font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Unidad</span>
                            <p style="margin: 4px 0 0; font-size: 14px; color: #3f3f46; font-weight: 500;">${unitNumber}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <a href="${dashboardLink}"
                       style="display: inline-block; padding: 16px 32px; background-color: #16a34a; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 2px 4px rgba(22, 163, 74, 0.3);">
                      Acceder al Dashboard
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Alternative Link -->
              <p style="margin: 0 0 10px; font-size: 14px; color: #71717a;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:
              </p>
              <p style="margin: 0; font-size: 12px; word-break: break-all;">
                <a href="${dashboardLink}" style="color: #16a34a;">${dashboardLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #fafafa; border-radius: 0 0 12px 12px; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0 0 10px; font-size: 12px; color: #71717a; text-align: center;">
                Este es un mensaje automático. No es necesario responder.
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
    condominiumName: string
    buildingName: string
    unitNumber: string
    dashboardLink: string
  }): string {
    const { recipientName, condominiumName, buildingName, unitNumber, dashboardLink } = params

    return `
Hola ${recipientName},

Tu solicitud de acceso al condominio ha sido APROBADA. Ya puedes acceder a tu unidad y a todas las funciones del condominio.

DETALLES
--------
Condominio: ${condominiumName}
Edificio: ${buildingName}
Unidad: ${unitNumber}

Para acceder a tu dashboard con la información actualizada, visita:
${dashboardLink}

Si ya tienes la app abierta, cierra sesión e inicia sesión nuevamente para ver los cambios.

---
Este es un mensaje automático. No es necesario responder.
© ${new Date().getFullYear()} Condominio App. Todos los derechos reservados.
`.trim()
  }
}
