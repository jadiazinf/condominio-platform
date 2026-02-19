import { env } from '@config/environment'
import logger from '@utils/logger'
import type { IService, TServiceResult } from '../base.service'
import { success, failure } from '../base.service'
import { EmailService } from './email.service'

export interface ISendUserInvitationEmailInput {
  to: string
  recipientName: string
  condominiumName: string | null
  roleName: string
  invitationToken: string
  expiresAt: Date
  inviterName?: string
  inviterEmail?: string
  managementCompanyName?: string
  managementCompanyContact?: string
}

export interface ISendUserInvitationEmailResult {
  emailId: string
}

/**
 * Service for sending user invitation emails.
 */
export class SendUserInvitationEmailService
  implements IService<ISendUserInvitationEmailInput, TServiceResult<ISendUserInvitationEmailResult>>
{
  constructor(private readonly emailService: EmailService = EmailService.getInstance()) {}

  async execute(
    input: ISendUserInvitationEmailInput
  ): Promise<TServiceResult<ISendUserInvitationEmailResult>> {
    const { to, recipientName, condominiumName, roleName, invitationToken, expiresAt } = input

    const invitationLink = `${env.APP_URL}/accept-user-invitation?token=${invitationToken}`
    const expiresAtFormatted = expiresAt.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const contextText = condominiumName
      ? `el condominio <strong style="color: #006FEE;">${condominiumName}</strong>`
      : 'la plataforma'

    const subject = condominiumName
      ? `Invitación para unirte a ${condominiumName}`
      : `Invitación para unirte a la plataforma`

    const html = this.generateEmailHtml({
      recipientName,
      contextText,
      roleName,
      invitationLink,
      expiresAtFormatted,
    })

    const text = this.generateEmailText({
      recipientName,
      condominiumName,
      roleName,
      invitationLink,
      expiresAtFormatted,
    })

    logger.info({ to, condominiumName, roleName, expiresAt: expiresAtFormatted }, 'Sending user invitation email')

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
    contextText: string
    roleName: string
    invitationLink: string
    expiresAtFormatted: string
  }): string {
    const { recipientName, contextText, roleName, invitationLink, expiresAtFormatted } = params

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitación</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-width: 100%; background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              <div style="width: 64px; height: 64px; background-color: #006FEE; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 28px; font-weight: bold;">C</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #18181b;">
                Has sido invitado
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
                Has sido invitado a unirte a ${contextText} como <strong>${roleName}</strong>.
              </p>

              <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
                Haz clic en el siguiente botón para aceptar la invitación y crear tu cuenta:
              </p>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <a href="${invitationLink}"
                       style="display: inline-block; padding: 16px 32px; background-color: #006FEE; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 111, 238, 0.3);">
                      Aceptar invitación
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiration Notice -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 30px;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  <strong>Importante:</strong> Esta invitación expira el ${expiresAtFormatted}.
                </p>
              </div>

              <!-- Alternative Link -->
              <p style="margin: 0 0 10px; font-size: 14px; color: #71717a;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:
              </p>
              <p style="margin: 0; font-size: 12px; word-break: break-all;">
                <a href="${invitationLink}" style="color: #006FEE;">${invitationLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #fafafa; border-radius: 0 0 12px 12px; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0 0 10px; font-size: 12px; color: #71717a; text-align: center;">
                Si no esperabas esta invitación, puedes ignorar este correo.
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
    condominiumName: string | null
    roleName: string
    invitationLink: string
    expiresAtFormatted: string
  }): string {
    const { recipientName, condominiumName, roleName, invitationLink, expiresAtFormatted } = params

    const contextText = condominiumName ? `el condominio ${condominiumName}` : 'la plataforma'

    return `
Hola ${recipientName},

Has sido invitado a unirte a ${contextText} como ${roleName}.

Para aceptar la invitación y crear tu cuenta, visita el siguiente enlace:

${invitationLink}

IMPORTANTE: Esta invitación expira el ${expiresAtFormatted}.

Si no esperabas esta invitación, puedes ignorar este correo.

---
© ${new Date().getFullYear()} Condominio App. Todos los derechos reservados.
`.trim()
  }
}
