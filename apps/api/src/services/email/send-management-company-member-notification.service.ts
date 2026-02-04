import { env } from '@config/environment'
import logger from '@utils/logger'
import type { IService, TServiceResult } from '../base.service'
import { success, failure } from '../base.service'
import { EmailService } from './email.service'

export interface ISendManagementCompanyMemberNotificationInput {
  to: string
  companyName: string
  newMemberName: string
  newMemberEmail: string
  memberRole: string
}

export interface ISendManagementCompanyMemberNotificationResult {
  emailId: string
}

/**
 * Service for sending notification emails to management companies when a new member is added.
 */
export class SendManagementCompanyMemberNotificationService
  implements IService<ISendManagementCompanyMemberNotificationInput, TServiceResult<ISendManagementCompanyMemberNotificationResult>>
{
  constructor(private readonly emailService: EmailService = new EmailService()) {}

  async execute(
    input: ISendManagementCompanyMemberNotificationInput
  ): Promise<TServiceResult<ISendManagementCompanyMemberNotificationResult>> {
    const { to, companyName, newMemberName, newMemberEmail, memberRole } = input

    const subject = `Nuevo miembro agregado a ${companyName}`

    const html = this.generateEmailHtml({
      companyName,
      newMemberName,
      newMemberEmail,
      memberRole,
    })

    const text = this.generateEmailText({
      companyName,
      newMemberName,
      newMemberEmail,
      memberRole,
    })

    logger.info({ to, companyName, newMemberEmail, memberRole }, 'Sending management company member notification email')

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
    companyName: string
    newMemberName: string
    newMemberEmail: string
    memberRole: string
  }): string {
    const { companyName, newMemberName, newMemberEmail, memberRole } = params

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nuevo miembro agregado</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="min-width: 100%; background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              <div style="width: 64px; height: 64px; background-color: #17c964; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 28px;">✓</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #18181b;">
                Nuevo miembro agregado
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #3f3f46;">
                Se ha agregado un nuevo miembro al equipo de <strong style="color: #006FEE;">${companyName}</strong>.
              </p>

              <!-- Member Info Card -->
              <div style="background-color: #f4f4f5; border-radius: 8px; padding: 24px; margin-bottom: 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding-bottom: 12px;">
                      <p style="margin: 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">
                        Nombre
                      </p>
                      <p style="margin: 4px 0 0; font-size: 16px; color: #18181b; font-weight: 500;">
                        ${newMemberName}
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 12px;">
                      <p style="margin: 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">
                        Email
                      </p>
                      <p style="margin: 4px 0 0; font-size: 16px; color: #18181b;">
                        <a href="mailto:${newMemberEmail}" style="color: #006FEE; text-decoration: none;">${newMemberEmail}</a>
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <p style="margin: 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">
                        Rol
                      </p>
                      <p style="margin: 4px 0 0; font-size: 16px; color: #18181b; font-weight: 500;">
                        ${memberRole}
                      </p>
                    </td>
                  </tr>
                </table>
              </div>

              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #71717a;">
                El nuevo miembro recibirá un correo de invitación para completar su registro en la plataforma.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #fafafa; border-radius: 0 0 12px 12px; border-top: 1px solid #e4e4e7;">
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
    companyName: string
    newMemberName: string
    newMemberEmail: string
    memberRole: string
  }): string {
    const { companyName, newMemberName, newMemberEmail, memberRole } = params

    return `
Nuevo miembro agregado a ${companyName}

Se ha agregado un nuevo miembro al equipo:

Nombre: ${newMemberName}
Email: ${newMemberEmail}
Rol: ${memberRole}

El nuevo miembro recibirá un correo de invitación para completar su registro en la plataforma.

---
© ${new Date().getFullYear()} Condominio App. Todos los derechos reservados.
`.trim()
  }
}
