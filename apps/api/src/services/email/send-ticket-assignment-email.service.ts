import { env } from '@config/environment'
import logger from '@utils/logger'
import type { IService, TServiceResult } from '../base.service'
import { success, failure } from '../base.service'
import { EmailService } from './email.service'
import { buildEmailHtml, buildEmailText, p } from './email-template'

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

const PRIORITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  urgent: { bg: '#fef2f2', text: '#dc2626', border: '#dc2626' },
  high: { bg: '#fff7ed', text: '#ea580c', border: '#ea580c' },
  medium: { bg: '#fefce8', text: '#ca8a04', border: '#ca8a04' },
  low: { bg: '#f0fdf4', text: '#16a34a', border: '#16a34a' },
}

const PRIORITY_LABELS: Record<string, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  open: { bg: '#eff6ff', text: '#2563eb', border: '#2563eb' },
  in_progress: { bg: '#fef3c7', text: '#d97706', border: '#d97706' },
  waiting_customer: { bg: '#f3e8ff', text: '#9333ea', border: '#9333ea' },
  resolved: { bg: '#dcfce7', text: '#16a34a', border: '#16a34a' },
  closed: { bg: '#f1f5f9', text: '#64748b', border: '#64748b' },
  cancelled: { bg: '#fee2e2', text: '#dc2626', border: '#dc2626' },
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Abierto',
  in_progress: 'En progreso',
  waiting_customer: 'Esperando cliente',
  resolved: 'Resuelto',
  closed: 'Cerrado',
  cancelled: 'Cancelado',
}

export class SendTicketAssignmentEmailService implements IService<
  ISendTicketAssignmentEmailInput,
  TServiceResult<ISendTicketAssignmentEmailResult>
> {
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

    const defaultColors = { bg: '#f4f4f5', text: '#71717a', border: '#71717a' }
    const priorityColors =
      PRIORITY_COLORS[ticketPriority.toLowerCase()] ?? PRIORITY_COLORS.low ?? defaultColors
    const priorityLabel = PRIORITY_LABELS[ticketPriority.toLowerCase()] ?? 'Baja'
    const statusColors = STATUS_COLORS[ticketStatus.toLowerCase()] ?? defaultColors
    const statusLabel = STATUS_LABELS[ticketStatus.toLowerCase()] ?? ticketStatus

    const formattedDate = new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(ticketCreatedAt)

    const truncatedDesc =
      ticketDescription.length > 300
        ? ticketDescription.substring(0, 300).trim() + '...'
        : ticketDescription

    const categoryCell = ticketCategory
      ? `<td style="padding-top: 16px; width: 50%;"><span style="font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Categoría</span><p style="margin: 4px 0 0; font-size: 14px; color: #3f3f46;">${ticketCategory}</p></td>`
      : '<td></td>'

    const ticketCardHtml = `
              <div style="background-color: #fafafa; border: 1px solid #e4e4e7; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding-bottom: 16px;"><span style="font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Ticket</span><p style="margin: 4px 0 0; font-size: 20px; font-weight: 700; color: #006FEE;">#${ticketNumber}</p></td>
                    <td style="padding-bottom: 16px; text-align: right;"><span style="display: inline-block; padding: 6px 12px; background-color: ${priorityColors.bg}; color: ${priorityColors.text}; border: 1px solid ${priorityColors.border}; border-radius: 6px; font-size: 12px; font-weight: 600;">${priorityLabel}</span></td>
                  </tr>
                  <tr><td colspan="2" style="padding-top: 16px; border-top: 1px solid #e4e4e7;"><span style="font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Asunto</span><p style="margin: 4px 0 0; font-size: 16px; color: #18181b; font-weight: 500;">${ticketSubject}</p></td></tr>
                  <tr><td colspan="2" style="padding-top: 16px;"><span style="font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Descripción</span><p style="margin: 4px 0 0; font-size: 14px; color: #3f3f46; line-height: 1.5;">${truncatedDesc}</p></td></tr>
                  <tr>
                    <td style="padding-top: 16px; width: 50%;"><span style="font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Estado</span><p style="margin: 4px 0 0;"><span style="display: inline-block; padding: 4px 10px; background-color: ${statusColors.bg}; color: ${statusColors.text}; border: 1px solid ${statusColors.border}; border-radius: 4px; font-size: 12px; font-weight: 500;">${statusLabel}</span></p></td>
                    ${categoryCell}
                  </tr>
                  <tr><td colspan="2" style="padding-top: 16px;"><span style="font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Fecha de creación</span><p style="margin: 4px 0 0; font-size: 14px; color: #3f3f46;">${formattedDate}</p></td></tr>
                  <tr>
                    <td style="padding-top: 16px; width: 50%;"><span style="font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Asignado por</span><p style="margin: 4px 0 0; font-size: 14px; color: #3f3f46; font-weight: 500;">${assignedByName}</p></td>
                    <td style="padding-top: 16px; width: 50%;"><span style="font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px;">Asignado a</span><p style="margin: 4px 0 0; font-size: 14px; color: #3f3f46; font-weight: 500;">${assignedToName}</p></td>
                  </tr>
                </table>
              </div>`

    const template = {
      title: `Ticket #${ticketNumber} asignado`,
      headerIcon: { symbol: '🎫', color: '#006FEE' },
      headerTitle: 'Nuevo ticket asignado',
      greeting: recipientName,
      bodyHtml: [
        p(
          `<strong>${assignedByName}</strong> te ha asignado un nuevo ticket de soporte para que lo gestiones.`
        ),
        ticketCardHtml,
      ].join('\n'),
      bodyText: `${assignedByName} te ha asignado un nuevo ticket de soporte.\n\nDETALLES DEL TICKET\n-------------------\nNúmero: #${ticketNumber}\nAsunto: ${ticketSubject}\nDescripción: ${truncatedDesc}\nEstado: ${statusLabel}\nPrioridad: ${priorityLabel}${ticketCategory ? `\nCategoría: ${ticketCategory}` : ''}\nFecha de creación: ${formattedDate}\nAsignado por: ${assignedByName}\nAsignado a: ${assignedToName}\n\nPara ver y gestionar este ticket, visita el enlace.`,
      cta: { label: 'Ver ticket', url: ticketLink, color: '#006FEE' },
      footerNote: 'Este es un mensaje automático del sistema de tickets de soporte.',
    }

    logger.info({ to, ticketNumber, ticketSubject }, 'Sending ticket assignment email')

    const result = await this.emailService.execute({
      to,
      subject,
      html: buildEmailHtml(template),
      text: buildEmailText(template),
    })

    if (!result.success) {
      return failure(result.error, result.code)
    }

    return success({ emailId: result.data.id })
  }
}
