import { env } from '@config/environment'
import logger from '@utils/logger'
import type { IService, TServiceResult } from '../base.service'
import { success, failure } from '../base.service'
import { EmailService } from './email.service'

export interface ISendTicketAssignmentEmailInput {
  to: string
  recipientName: string
  ticketId: string
  ticketNumber: string
  ticketSubject: string
  ticketDescription: string
  ticketPriority: string
  ticketStatus: string
  ticketCategory?: string
  ticketCreatedAt: Date
  assignedByName: string
  assignedToName: string
}

export interface ISendTicketAssignmentEmailResult {
  emailId: string
}

/**
 * Service for sending ticket assignment notification emails.
 */
export class SendTicketAssignmentEmailService
  implements IService<ISendTicketAssignmentEmailInput, TServiceResult<ISendTicketAssignmentEmailResult>>
{
  constructor(private readonly emailService: EmailService = EmailService.getInstance()) {}

  async execute(
    input: ISendTicketAssignmentEmailInput
  ): Promise<TServiceResult<ISendTicketAssignmentEmailResult>> {
    const {
      to,
      recipientName,
      ticketId,
      ticketNumber,
      ticketSubject,
      ticketDescription,
      ticketPriority,
      ticketStatus,
      ticketCategory,
      ticketCreatedAt,
      assignedByName,
      assignedToName,
    } = input

    const ticketLink = `${env.APP_URL}/dashboard/tickets/${ticketId}`

    const subject = `Se te ha asignado el ticket #${ticketNumber}`

    const html = this.generateEmailHtml({
      recipientName,
      ticketNumber,
      ticketSubject,
      ticketDescription,
      ticketPriority,
      ticketStatus,
      ticketCategory,
      ticketCreatedAt,
      assignedByName,
      assignedToName,
      ticketLink,
    })

    const text = this.generateEmailText({
      recipientName,
      ticketNumber,
      ticketSubject,
      ticketDescription,
      ticketPriority,
      ticketStatus,
      ticketCategory,
      ticketCreatedAt,
      assignedByName,
      assignedToName,
      ticketLink,
    })

    logger.info({ to, ticketNumber, ticketSubject }, 'Sending ticket assignment email')

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

  private getPriorityColor(priority: string): { bg: string; text: string; border: string } {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return { bg: '#fef2f2', text: '#dc2626', border: '#dc2626' }
      case 'high':
        return { bg: '#fff7ed', text: '#ea580c', border: '#ea580c' }
      case 'medium':
        return { bg: '#fefce8', text: '#ca8a04', border: '#ca8a04' }
      case 'low':
      default:
        return { bg: '#f0fdf4', text: '#16a34a', border: '#16a34a' }
    }
  }

  private getPriorityLabel(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'Urgente'
      case 'high':
        return 'Alta'
      case 'medium':
        return 'Media'
      case 'low':
      default:
        return 'Baja'
    }
  }

  private getStatusLabel(status: string): string {
    switch (status.toLowerCase()) {
      case 'open':
        return 'Abierto'
      case 'in_progress':
        return 'En progreso'
      case 'waiting_customer':
        return 'Esperando cliente'
      case 'resolved':
        return 'Resuelto'
      case 'closed':
        return 'Cerrado'
      case 'cancelled':
        return 'Cancelado'
      default:
        return status
    }
  }

  private getStatusColor(status: string): { bg: string; text: string; border: string } {
    switch (status.toLowerCase()) {
      case 'open':
        return { bg: '#eff6ff', text: '#2563eb', border: '#2563eb' }
      case 'in_progress':
        return { bg: '#fef3c7', text: '#d97706', border: '#d97706' }
      case 'waiting_customer':
        return { bg: '#f3e8ff', text: '#9333ea', border: '#9333ea' }
      case 'resolved':
        return { bg: '#dcfce7', text: '#16a34a', border: '#16a34a' }
      case 'closed':
        return { bg: '#f1f5f9', text: '#64748b', border: '#64748b' }
      case 'cancelled':
        return { bg: '#fee2e2', text: '#dc2626', border: '#dc2626' }
      default:
        return { bg: '#f4f4f5', text: '#71717a', border: '#71717a' }
    }
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  private truncateDescription(description: string, maxLength: number = 300): string {
    if (description.length <= maxLength) return description
    return description.substring(0, maxLength).trim() + '...'
  }

  private generateEmailHtml(params: {
    recipientName: string
    ticketNumber: string
    ticketSubject: string
    ticketDescription: string
    ticketPriority: string
    ticketStatus: string
    ticketCategory?: string
    ticketCreatedAt: Date
    assignedByName: string
    assignedToName: string
    ticketLink: string
  }): string {
    const {
      recipientName,
      ticketNumber,
      ticketSubject,
      ticketDescription,
      ticketPriority,
      ticketStatus,
      ticketCategory,
      ticketCreatedAt,
      assignedByName,
      assignedToName,
      ticketLink,
    } = params
    const priorityColors = this.getPriorityColor(ticketPriority)
    const priorityLabel = this.getPriorityLabel(ticketPriority)
    const statusColors = this.getStatusColor(ticketStatus)
    const statusLabel = this.getStatusLabel(ticketStatus)
    const formattedDate = this.formatDate(ticketCreatedAt)
    const truncatedDescription = this.truncateDescription(ticketDescription)

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket #${ticketNumber} asignado</title>
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
                <span style="color: white; font-size: 28px; font-weight: bold;">🎫</span>
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #18181b;">
                Nuevo ticket asignado
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
                <strong>${assignedByName}</strong> te ha asignado un nuevo ticket de soporte para que lo gestiones.
              </p>

              <!-- Ticket Info Card -->
              <div style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <!-- Ticket Number and Priority -->
                  <tr>
                    <td style="padding-bottom: 16px;">
                      <span style="font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Ticket</span>
                      <p style="margin: 4px 0 0; font-size: 20px; font-weight: 700; color: #006FEE;">#${ticketNumber}</p>
                    </td>
                    <td style="padding-bottom: 16px; text-align: right;">
                      <span style="display: inline-block; padding: 6px 12px; background-color: ${priorityColors.bg}; color: ${priorityColors.text}; border: 1px solid ${priorityColors.border}; border-radius: 6px; font-size: 12px; font-weight: 600;">
                        ${priorityLabel}
                      </span>
                    </td>
                  </tr>

                  <!-- Subject -->
                  <tr>
                    <td colspan="2" style="padding-top: 16px; border-top: 1px solid #e4e4e7;">
                      <span style="font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Asunto</span>
                      <p style="margin: 4px 0 0; font-size: 16px; color: #18181b; font-weight: 500;">${ticketSubject}</p>
                    </td>
                  </tr>

                  <!-- Description -->
                  <tr>
                    <td colspan="2" style="padding-top: 16px;">
                      <span style="font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Descripción</span>
                      <p style="margin: 4px 0 0; font-size: 14px; color: #3f3f46; line-height: 1.5;">${truncatedDescription}</p>
                    </td>
                  </tr>

                  <!-- Status and Category Row -->
                  <tr>
                    <td style="padding-top: 16px; width: 50%;">
                      <span style="font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Estado</span>
                      <p style="margin: 4px 0 0;">
                        <span style="display: inline-block; padding: 4px 10px; background-color: ${statusColors.bg}; color: ${statusColors.text}; border: 1px solid ${statusColors.border}; border-radius: 4px; font-size: 12px; font-weight: 500;">
                          ${statusLabel}
                        </span>
                      </p>
                    </td>
                    ${ticketCategory ? `
                    <td style="padding-top: 16px; width: 50%;">
                      <span style="font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Categoría</span>
                      <p style="margin: 4px 0 0; font-size: 14px; color: #3f3f46;">${ticketCategory}</p>
                    </td>
                    ` : '<td></td>'}
                  </tr>

                  <!-- Created At -->
                  <tr>
                    <td colspan="2" style="padding-top: 16px;">
                      <span style="font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Fecha de creación</span>
                      <p style="margin: 4px 0 0; font-size: 14px; color: #3f3f46;">${formattedDate}</p>
                    </td>
                  </tr>

                  <!-- Assignment Info -->
                  <tr>
                    <td style="padding-top: 16px; width: 50%;">
                      <span style="font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Asignado por</span>
                      <p style="margin: 4px 0 0; font-size: 14px; color: #3f3f46; font-weight: 500;">${assignedByName}</p>
                    </td>
                    <td style="padding-top: 16px; width: 50%;">
                      <span style="font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Asignado a</span>
                      <p style="margin: 4px 0 0; font-size: 14px; color: #3f3f46; font-weight: 500;">${assignedToName}</p>
                    </td>
                  </tr>

                  <!-- Ticket URL -->
                  <tr>
                    <td colspan="2" style="padding-top: 16px;">
                      <span style="font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">URL del ticket</span>
                      <p style="margin: 4px 0 0; font-size: 12px; word-break: break-all;">
                        <a href="${ticketLink}" style="color: #006FEE;">${ticketLink}</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <a href="${ticketLink}"
                       style="display: inline-block; padding: 16px 32px; background-color: #006FEE; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 111, 238, 0.3);">
                      Ver ticket
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Alternative Link -->
              <p style="margin: 0 0 10px; font-size: 14px; color: #71717a;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:
              </p>
              <p style="margin: 0; font-size: 12px; word-break: break-all;">
                <a href="${ticketLink}" style="color: #006FEE;">${ticketLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #fafafa; border-radius: 0 0 12px 12px; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0 0 10px; font-size: 12px; color: #71717a; text-align: center;">
                Este es un mensaje automático del sistema de tickets de soporte.
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
    ticketNumber: string
    ticketSubject: string
    ticketDescription: string
    ticketPriority: string
    ticketStatus: string
    ticketCategory?: string
    ticketCreatedAt: Date
    assignedByName: string
    assignedToName: string
    ticketLink: string
  }): string {
    const {
      recipientName,
      ticketNumber,
      ticketSubject,
      ticketDescription,
      ticketPriority,
      ticketStatus,
      ticketCategory,
      ticketCreatedAt,
      assignedByName,
      assignedToName,
      ticketLink,
    } = params
    const priorityLabel = this.getPriorityLabel(ticketPriority)
    const statusLabel = this.getStatusLabel(ticketStatus)
    const formattedDate = this.formatDate(ticketCreatedAt)
    const truncatedDescription = this.truncateDescription(ticketDescription)

    return `
Hola ${recipientName},

${assignedByName} te ha asignado un nuevo ticket de soporte para que lo gestiones.

DETALLES DEL TICKET
-------------------
Número: #${ticketNumber}
Asunto: ${ticketSubject}
Descripción: ${truncatedDescription}
Estado: ${statusLabel}
Prioridad: ${priorityLabel}${ticketCategory ? `\nCategoría: ${ticketCategory}` : ''}
Fecha de creación: ${formattedDate}
Asignado por: ${assignedByName}
Asignado a: ${assignedToName}

URL del ticket:
${ticketLink}

Para ver y gestionar este ticket, visita el enlace de arriba.

---
Este es un mensaje automático del sistema de tickets de soporte.
© ${new Date().getFullYear()} Condominio App. Todos los derechos reservados.
`.trim()
  }
}
