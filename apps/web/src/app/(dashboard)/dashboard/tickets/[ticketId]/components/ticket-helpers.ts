export function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'open':
      return 'primary'
    case 'in_progress':
      return 'secondary'
    case 'waiting_customer':
      return 'warning'
    case 'resolved':
      return 'success'
    case 'closed':
      return 'default'
    case 'cancelled':
      return 'danger'
    default:
      return 'default'
  }
}

export function getPriorityColor(priority: string) {
  switch (priority.toLowerCase()) {
    case 'urgent':
      return 'danger'
    case 'high':
      return 'warning'
    case 'medium':
      return 'primary'
    case 'low':
      return 'default'
    default:
      return 'default'
  }
}

export function formatDate(date: Date | string, locale: string = 'es-VE') {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
