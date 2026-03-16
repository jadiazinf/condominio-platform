export {
  getTicketStatusColor as getStatusColor,
  getTicketPriorityColor as getPriorityColor,
} from '@/utils/status-colors'

export function formatDate(date: Date | string, locale: string = 'es-VE') {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
