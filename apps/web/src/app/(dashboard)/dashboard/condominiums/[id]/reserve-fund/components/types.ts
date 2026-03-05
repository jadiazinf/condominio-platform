export type TReserveFundTranslations = {
  title: string
  subtitle: string
  addConcept: string
  tabs: {
    summary: string
    concepts: string
    payments: string
    expenses: string
  }
  summary: TSummaryTranslations
  concepts: TConceptsTranslations
  payments: TPaymentsTranslations
  expenses: TExpensesTranslations
}

export type TSummaryTranslations = {
  totalPaid: string
  totalCharged: string
  totalPending: string
  totalExpenses: string
  conceptCount: string
}

export type TExpensesTranslations = {
  title: string
  empty: string
  addExpense: string
  filters: {
    allStatuses: string
    startDate: string
    endDate: string
  }
  table: {
    description: string
    amount: string
    date: string
    vendor: string
    status: string
  }
  status: Record<string, string>
  detail: {
    title: string
    chargeInfo: string
    name: string
    description: string
    amount: string
    date: string
    vendorInfo: string
    vendorType: string
    vendorName: string
    vendorTaxId: string
    vendorPhone: string
    vendorEmail: string
    vendorAddress: string
    noVendor: string
    linkedServices: string
    documents: string
    noDocs: string
    invoiceNumber: string
    notes: string
    download: string
    createdAt: string
    providerTypes: {
      individual: string
      company: string
      cooperative: string
      government: string
      internal: string
    }
  }
  form: {
    title: string
    name: string
    namePlaceholder: string
    description: string
    descriptionPlaceholder: string
    amount: string
    currency: string
    expenseDate: string
    submit: string
    submitting: string
    success: string
    steps: {
      chargeInfo: string
      vendor: string
      documents: string
      review: string
    }
    vendor: {
      type: string
      individual: string
      company: string
      name: string
      namePlaceholder: string
      taxId: string
      taxIdPlaceholder: string
      phone: string
      email: string
      address: string
      addressPlaceholder: string
      selectExisting: string
      selectPlaceholder: string
      noServices: string
      manualEntry: string
      orManual: string
      tableName: string
      tableType: string
      tableTaxId: string
      tablePhone: string
      allTypes: string
      selected: string
      cooperative: string
      government: string
      internal: string
    }
    documents: {
      upload: string
      uploadHint: string
      maxSize: string
      allowedTypes: string
      retry: string
      invoiceNumber: string
      notes: string
    }
    review: {
      chargeInfo: string
      vendorInfo: string
      attachedDocs: string
      noVendor: string
      noDocs: string
    }
    navigation: {
      next: string
      previous: string
      cancel: string
    }
  }
}

export type TConceptsTranslations = {
  title: string
  empty: string
  emptyDescription: string
  table: {
    name: string
    recurring: string
    recurrence: string
    status: string
    createdAt: string
  }
  recurrence: {
    monthly: string
    quarterly: string
    yearly: string
  }
  yes: string
  no: string
  status: {
    active: string
    inactive: string
  }
  filters: {
    allStatuses: string
    active: string
    inactive: string
    searchPlaceholder: string
  }
  noResults: string
  noResultsHint: string
}

export type TPaymentsTranslations = {
  title: string
  empty: string
  filters: {
    unit: string
    allUnits: string
    concept: string
    allConcepts: string
    startDate: string
    endDate: string
  }
  table: {
    paymentNumber: string
    unit: string
    amount: string
    date: string
    status: string
    method: string
  }
  status: Record<string, string>
  methods: Record<string, string>
}
