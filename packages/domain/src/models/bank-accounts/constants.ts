export const NATIONAL_PAYMENT_METHODS = [
  'transfer',
  'pago_movil',
  'interbancario',
] as const

export const INTERNATIONAL_PAYMENT_METHODS = [
  'wire_transfer',
  'ach',
  'zelle',
  'paypal',
  'wise',
  'crypto',
  'other',
] as const

export const ALL_BANK_PAYMENT_METHODS = [
  ...NATIONAL_PAYMENT_METHODS,
  ...INTERNATIONAL_PAYMENT_METHODS,
] as const

export const VE_IDENTITY_DOC_TYPES = ['V', 'E', 'J', 'G', 'P', 'C'] as const

export const VE_ACCOUNT_TYPES = ['corriente', 'ahorro', 'divisas'] as const

export const INTERNATIONAL_ACCOUNT_TYPES = ['checking', 'savings'] as const

export const INTERNATIONAL_HOLDER_TYPES = ['individual', 'company'] as const

export const CRYPTO_NETWORKS = ['TRC-20', 'ERC-20', 'BEP-20'] as const

export const CRYPTO_CURRENCIES = ['USDT', 'USDC', 'BTC', 'ETH'] as const

export const PAYMENT_METHOD_LABELS: Record<string, { es: string; en: string }> = {
  transfer: { es: 'Transferencia Bancaria', en: 'Bank Transfer' },
  pago_movil: { es: 'Pago Movil', en: 'Pago Movil' },
  interbancario: { es: 'Interbancario', en: 'Interbank' },
  wire_transfer: { es: 'Transferencia Internacional (SWIFT)', en: 'Wire Transfer (SWIFT)' },
  ach: { es: 'ACH', en: 'ACH' },
  zelle: { es: 'Zelle', en: 'Zelle' },
  paypal: { es: 'PayPal', en: 'PayPal' },
  wise: { es: 'Wise', en: 'Wise' },
  crypto: { es: 'Criptomoneda', en: 'Cryptocurrency' },
  other: { es: 'Otro', en: 'Other' },
}
