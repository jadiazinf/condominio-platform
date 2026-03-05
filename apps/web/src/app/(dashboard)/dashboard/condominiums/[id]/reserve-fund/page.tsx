import { getTranslations } from '@/libs/i18n/server'
import { getFullSession } from '@/libs/session'
import { ReserveFundPageClient } from './components/ReserveFundPageClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CondominiumReserveFundPage({ params }: PageProps) {
  const { id } = await params
  const [{ t }, session] = await Promise.all([getTranslations(), getFullSession()])

  const managementCompanyId = session?.activeRole === 'management_company'
    ? session.managementCompanies?.[0]?.managementCompanyId ?? ''
    : ''

  const p = 'admin.condominiums.detail.reserveFund'

  const translations = {
    title: t(`${p}.title`),
    subtitle: t(`${p}.subtitle`),
    addConcept: t(`${p}.addConcept`),
    tabs: {
      summary: t(`${p}.tabs.summary`),
      concepts: t(`${p}.tabs.concepts`),
      payments: t(`${p}.tabs.payments`),
      expenses: t(`${p}.tabs.expenses`),
    },
    summary: {
      totalPaid: t(`${p}.summary.totalPaid`),
      totalCharged: t(`${p}.summary.totalCharged`),
      totalPending: t(`${p}.summary.totalPending`),
      totalExpenses: t(`${p}.summary.totalExpenses`),
      conceptCount: t(`${p}.summary.conceptCount`),
    },
    concepts: {
      title: t(`${p}.concepts.title`),
      empty: t(`${p}.concepts.empty`),
      emptyDescription: t(`${p}.concepts.emptyDescription`),
      table: {
        name: t('admin.condominiums.detail.paymentConcepts.table.name'),
        recurring: t('admin.condominiums.detail.paymentConcepts.table.recurring'),
        recurrence: t('admin.condominiums.detail.paymentConcepts.table.recurrence'),
        status: t('admin.condominiums.detail.paymentConcepts.table.status'),
        createdAt: t('admin.condominiums.detail.paymentConcepts.table.createdAt'),
      },
      recurrence: {
        monthly: t('admin.condominiums.detail.paymentConcepts.recurrence.monthly'),
        quarterly: t('admin.condominiums.detail.paymentConcepts.recurrence.quarterly'),
        yearly: t('admin.condominiums.detail.paymentConcepts.recurrence.yearly'),
      },
      yes: t('common.yes'),
      no: t('common.no'),
      status: {
        active: t('common.status.active'),
        inactive: t('common.status.inactive'),
      },
      filters: {
        allStatuses: t('admin.condominiums.detail.paymentConcepts.filters.allStatuses'),
        active: t('admin.condominiums.detail.paymentConcepts.filters.active'),
        inactive: t('admin.condominiums.detail.paymentConcepts.filters.inactive'),
        searchPlaceholder: t('admin.condominiums.detail.paymentConcepts.filters.searchPlaceholder'),
      },
      noResults: t('admin.condominiums.detail.paymentConcepts.noResults'),
      noResultsHint: t('admin.condominiums.detail.paymentConcepts.noResultsHint'),
    },
    payments: {
      title: t(`${p}.payments.title`),
      empty: t(`${p}.payments.empty`),
      filters: {
        unit: t(`${p}.payments.filters.unit`),
        allUnits: t(`${p}.payments.filters.allUnits`),
        concept: t(`${p}.payments.filters.concept`),
        allConcepts: t(`${p}.payments.filters.allConcepts`),
        startDate: t(`${p}.payments.filters.startDate`),
        endDate: t(`${p}.payments.filters.endDate`),
      },
      table: {
        paymentNumber: t(`${p}.payments.table.paymentNumber`),
        unit: t(`${p}.payments.table.unit`),
        amount: t(`${p}.payments.table.amount`),
        date: t(`${p}.payments.table.date`),
        status: t(`${p}.payments.table.status`),
        method: t(`${p}.payments.table.method`),
      },
      status: {
        pending: t('admin.condominiums.detail.payments.status.pending'),
        pending_verification: t('admin.condominiums.detail.payments.status.pendingVerification'),
        completed: t('admin.condominiums.detail.payments.status.completed'),
        failed: t('admin.condominiums.detail.payments.status.failed'),
        refunded: t('admin.condominiums.detail.payments.status.refunded'),
        rejected: t('admin.condominiums.detail.payments.status.rejected'),
      },
      methods: {
        transfer: t('admin.condominiums.detail.payments.methods.transfer'),
        cash: t('admin.condominiums.detail.payments.methods.cash'),
        card: t('admin.condominiums.detail.payments.methods.card'),
        gateway: t('admin.condominiums.detail.payments.methods.gateway'),
      },
    },
    expenses: {
      title: t(`${p}.expenses.title`),
      empty: t(`${p}.expenses.empty`),
      addExpense: t(`${p}.expenses.addExpense`),
      filters: {
        allStatuses: t(`${p}.expenses.filters.allStatuses`),
        startDate: t(`${p}.expenses.filters.startDate`),
        endDate: t(`${p}.expenses.filters.endDate`),
      },
      table: {
        description: t(`${p}.expenses.table.description`),
        amount: t(`${p}.expenses.table.amount`),
        date: t(`${p}.expenses.table.date`),
        vendor: t(`${p}.expenses.table.vendor`),
        status: t(`${p}.expenses.table.status`),
      },
      status: {
        pending: t(`${p}.expenses.status.pending`),
        approved: t(`${p}.expenses.status.approved`),
        rejected: t(`${p}.expenses.status.rejected`),
        paid: t(`${p}.expenses.status.paid`),
      },
      detail: {
        title: t(`${p}.expenses.detail.title`),
        chargeInfo: t(`${p}.expenses.detail.chargeInfo`),
        name: t(`${p}.expenses.detail.name`),
        description: t(`${p}.expenses.detail.description`),
        amount: t(`${p}.expenses.detail.amount`),
        date: t(`${p}.expenses.detail.date`),
        vendorInfo: t(`${p}.expenses.detail.vendorInfo`),
        vendorType: t(`${p}.expenses.detail.vendorType`),
        vendorName: t(`${p}.expenses.detail.vendorName`),
        vendorTaxId: t(`${p}.expenses.detail.vendorTaxId`),
        vendorPhone: t(`${p}.expenses.detail.vendorPhone`),
        vendorEmail: t(`${p}.expenses.detail.vendorEmail`),
        vendorAddress: t(`${p}.expenses.detail.vendorAddress`),
        noVendor: t(`${p}.expenses.detail.noVendor`),
        linkedServices: t(`${p}.expenses.detail.linkedServices`),
        documents: t(`${p}.expenses.detail.documents`),
        noDocs: t(`${p}.expenses.detail.noDocs`),
        invoiceNumber: t(`${p}.expenses.detail.invoiceNumber`),
        notes: t(`${p}.expenses.detail.notes`),
        download: t(`${p}.expenses.detail.download`),
        createdAt: t(`${p}.expenses.detail.createdAt`),
        providerTypes: {
          individual: t(`${p}.expenses.detail.providerTypes.individual`),
          company: t(`${p}.expenses.detail.providerTypes.company`),
          cooperative: t(`${p}.expenses.detail.providerTypes.cooperative`),
          government: t(`${p}.expenses.detail.providerTypes.government`),
          internal: t(`${p}.expenses.detail.providerTypes.internal`),
        },
      },
      form: {
        title: t(`${p}.expenses.form.title`),
        name: t(`${p}.expenses.form.name`),
        namePlaceholder: t(`${p}.expenses.form.namePlaceholder`),
        description: t(`${p}.expenses.form.description`),
        descriptionPlaceholder: t(`${p}.expenses.form.descriptionPlaceholder`),
        amount: t(`${p}.expenses.form.amount`),
        currency: t(`${p}.expenses.form.currency`),
        expenseDate: t(`${p}.expenses.form.expenseDate`),
        submit: t(`${p}.expenses.form.submit`),
        submitting: t(`${p}.expenses.form.submitting`),
        success: t(`${p}.expenses.form.success`),
        steps: {
          chargeInfo: t(`${p}.expenses.form.steps.chargeInfo`),
          vendor: t(`${p}.expenses.form.steps.vendor`),
          documents: t(`${p}.expenses.form.steps.documents`),
          review: t(`${p}.expenses.form.steps.review`),
        },
        vendor: {
          type: t(`${p}.expenses.form.vendor.type`),
          individual: t(`${p}.expenses.form.vendor.individual`),
          company: t(`${p}.expenses.form.vendor.company`),
          name: t(`${p}.expenses.form.vendor.name`),
          namePlaceholder: t(`${p}.expenses.form.vendor.namePlaceholder`),
          taxId: t(`${p}.expenses.form.vendor.taxId`),
          taxIdPlaceholder: t(`${p}.expenses.form.vendor.taxIdPlaceholder`),
          phone: t(`${p}.expenses.form.vendor.phone`),
          email: t(`${p}.expenses.form.vendor.email`),
          address: t(`${p}.expenses.form.vendor.address`),
          addressPlaceholder: t(`${p}.expenses.form.vendor.addressPlaceholder`),
          selectExisting: t(`${p}.expenses.form.vendor.selectExisting`),
          selectPlaceholder: t(`${p}.expenses.form.vendor.selectPlaceholder`),
          noServices: t(`${p}.expenses.form.vendor.noServices`),
          manualEntry: t(`${p}.expenses.form.vendor.manualEntry`),
          orManual: t(`${p}.expenses.form.vendor.orManual`),
          tableName: t(`${p}.expenses.form.vendor.tableName`),
          tableType: t(`${p}.expenses.form.vendor.tableType`),
          tableTaxId: t(`${p}.expenses.form.vendor.tableTaxId`),
          tablePhone: t(`${p}.expenses.form.vendor.tablePhone`),
          allTypes: t(`${p}.expenses.form.vendor.allTypes`),
          selected: t(`${p}.expenses.form.vendor.selected`),
          cooperative: t(`${p}.expenses.form.vendor.cooperative`),
          government: t(`${p}.expenses.form.vendor.government`),
          internal: t(`${p}.expenses.form.vendor.internal`),
        },
        documents: {
          upload: t(`${p}.expenses.form.documents.upload`),
          uploadHint: t(`${p}.expenses.form.documents.uploadHint`),
          maxSize: t(`${p}.expenses.form.documents.maxSize`),
          allowedTypes: t(`${p}.expenses.form.documents.allowedTypes`),
          retry: t(`${p}.expenses.form.documents.retry`),
          invoiceNumber: t(`${p}.expenses.form.documents.invoiceNumber`),
          notes: t(`${p}.expenses.form.documents.notes`),
        },
        review: {
          chargeInfo: t(`${p}.expenses.form.review.chargeInfo`),
          vendorInfo: t(`${p}.expenses.form.review.vendorInfo`),
          attachedDocs: t(`${p}.expenses.form.review.attachedDocs`),
          noVendor: t(`${p}.expenses.form.review.noVendor`),
          noDocs: t(`${p}.expenses.form.review.noDocs`),
        },
        navigation: {
          next: t(`${p}.expenses.form.navigation.next`),
          previous: t(`${p}.expenses.form.navigation.previous`),
          cancel: t(`${p}.expenses.form.navigation.cancel`),
        },
      },
    },
  }

  return (
    <ReserveFundPageClient
      condominiumId={id}
      managementCompanyId={managementCompanyId}
      translations={translations}
    />
  )
}
