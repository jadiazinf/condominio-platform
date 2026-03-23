import { redirect } from 'next/navigation'

import { ReceiptDetailClient } from './components/ReceiptDetailClient'

import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'

export default async function ReceiptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ t }, session, resolvedParams] = await Promise.all([
    getTranslations(),
    getFullSession(),
    params,
  ])

  if (!session.sessionToken) {
    redirect('/auth')
  }

  const p = 'admin.receiptDetail'
  const translations = {
    title: t(`${p}.title`),
    back: t(`${p}.back`),
    receiptNumber: t(`${p}.receiptNumber`),
    period: t(`${p}.period`),
    status: t(`${p}.status`),
    unitAliquot: t(`${p}.unitAliquot`),
    generatedAt: t(`${p}.generatedAt`),
    amounts: {
      ordinary: t(`${p}.amounts.ordinary`),
      extraordinary: t(`${p}.amounts.extraordinary`),
      reserveFund: t(`${p}.amounts.reserveFund`),
      interest: t(`${p}.amounts.interest`),
      fines: t(`${p}.amounts.fines`),
      previousBalance: t(`${p}.amounts.previousBalance`),
      total: t(`${p}.amounts.total`),
    },
    breakdown: {
      title: t(`${p}.breakdown.title`),
      item: t(`${p}.breakdown.item`),
      amount: t(`${p}.breakdown.amount`),
    },
    statuses: {
      draft: t(`${p}.statuses.draft`),
      generated: t(`${p}.statuses.generated`),
      sent: t(`${p}.statuses.sent`),
      voided: t(`${p}.statuses.voided`),
      pending: t(`${p}.statuses.pending`),
      partial: t(`${p}.statuses.partial`),
      paid: t(`${p}.statuses.paid`),
      overdue: t(`${p}.statuses.overdue`),
    },
    void: t(`${p}.void`),
    voidConfirm: t(`${p}.voidConfirm`),
    downloadPdf: t(`${p}.downloadPdf`),
    sendEmail: t(`${p}.sendEmail`),
    sendEmailSuccess: t(`${p}.sendEmailSuccess`),
    loading: t(`${p}.loading`),
    notFound: t(`${p}.notFound`),
    infoModal: {
      button: t(`${p}.infoModal.button`),
      title: t(`${p}.infoModal.title`),
      intro: t(`${p}.infoModal.intro`),
      conceptsTitle: t(`${p}.infoModal.conceptsTitle`),
      conceptsBody: t(`${p}.infoModal.conceptsBody`),
      formulasTitle: t(`${p}.infoModal.formulasTitle`),
      formulaFixed: t(`${p}.infoModal.formulaFixed`),
      formulaAliquot: t(`${p}.infoModal.formulaAliquot`),
      formulaPerUnit: t(`${p}.infoModal.formulaPerUnit`),
      breakdownTitle: t(`${p}.infoModal.breakdownTitle`),
      breakdownBody: t(`${p}.infoModal.breakdownBody`),
      summaryTitle: t(`${p}.infoModal.summaryTitle`),
      summaryOrdinary: t(`${p}.infoModal.summaryOrdinary`),
      summaryExtraordinary: t(`${p}.infoModal.summaryExtraordinary`),
      summaryReserve: t(`${p}.infoModal.summaryReserve`),
      summaryInterest: t(`${p}.infoModal.summaryInterest`),
      summaryFines: t(`${p}.infoModal.summaryFines`),
      summaryPrevBalance: t(`${p}.infoModal.summaryPrevBalance`),
      summaryTotal: t(`${p}.infoModal.summaryTotal`),
      interestTitle: t(`${p}.infoModal.interestTitle`),
      interestBody: t(`${p}.infoModal.interestBody`),
      close: t(`${p}.infoModal.close`),
    },
  }

  return <ReceiptDetailClient id={resolvedParams.id} translations={translations} />
}
