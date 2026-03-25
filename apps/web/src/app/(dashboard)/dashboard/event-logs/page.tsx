import { redirect } from 'next/navigation'

import { EventLogsClient } from './components/EventLogsClient'

import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

export default async function EventLogsPage() {
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  if (!session.sessionToken) {
    redirect('/auth')
  }

  if (!session.superadmin?.isActive) {
    redirect('/dashboard')
  }

  const p = 'admin.eventLogs'
  const translations = {
    title: t(`${p}.title`),
    subtitle: t(`${p}.subtitle`),
    table: {
      event: t(`${p}.table.event`),
      category: t(`${p}.table.category`),
      level: t(`${p}.table.level`),
      message: t(`${p}.table.message`),
      source: t(`${p}.table.source`),
      result: t(`${p}.table.result`),
      module: t(`${p}.table.module`),
      duration: t(`${p}.table.duration`),
      date: t(`${p}.table.date`),
    },
    filters: {
      category: t(`${p}.filters.category`),
      level: t(`${p}.filters.level`),
      result: t(`${p}.filters.result`),
      source: t(`${p}.filters.source`),
      dateFrom: t(`${p}.filters.dateFrom`),
      dateTo: t(`${p}.filters.dateTo`),
      search: t(`${p}.filters.search`),
      clear: t(`${p}.filters.clear`),
    },
    categories: {
      payment: t(`${p}.categories.payment`),
      quota: t(`${p}.categories.quota`),
      receipt: t(`${p}.categories.receipt`),
      worker: t(`${p}.categories.worker`),
      notification: t(`${p}.categories.notification`),
      auth: t(`${p}.categories.auth`),
      system: t(`${p}.categories.system`),
      user: t(`${p}.categories.user`),
      condominium: t(`${p}.categories.condominium`),
      subscription: t(`${p}.categories.subscription`),
    },
    levels: {
      info: t(`${p}.levels.info`),
      warn: t(`${p}.levels.warn`),
      error: t(`${p}.levels.error`),
      critical: t(`${p}.levels.critical`),
    },
    results: {
      success: t(`${p}.results.success`),
      failure: t(`${p}.results.failure`),
      partial: t(`${p}.results.partial`),
    },
    sources: {
      api: t(`${p}.sources.api`),
      worker: t(`${p}.sources.worker`),
      webhook: t(`${p}.sources.webhook`),
      system: t(`${p}.sources.system`),
      manual: t(`${p}.sources.manual`),
    },
    detail: {
      title: t(`${p}.detail.title`),
      action: t(`${p}.detail.action`),
      entityType: t(`${p}.detail.entityType`),
      entityId: t(`${p}.detail.entityId`),
      userId: t(`${p}.detail.userId`),
      userRole: t(`${p}.detail.userRole`),
      errorCode: t(`${p}.detail.errorCode`),
      errorMessage: t(`${p}.detail.errorMessage`),
      metadata: t(`${p}.detail.metadata`),
      ipAddress: t(`${p}.detail.ipAddress`),
      noMetadata: t(`${p}.detail.noMetadata`),
    },
    empty: t(`${p}.empty`),
    emptyDescription: t(`${p}.emptyDescription`),
  }

  return <EventLogsClient translations={translations} />
}
