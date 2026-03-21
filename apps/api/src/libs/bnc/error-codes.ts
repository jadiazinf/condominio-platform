/**
 * BNC ESolutions API v2.1 — Error code to user-friendly message mapping.
 *
 * Error codes are returned in the `message` field of BNC responses.
 * Format: "CODE description" (e.g., "G51 Insufficient funds")
 *
 * Messages are in Spanish (primary user language) with English fallbacks.
 */

export interface IBncErrorInfo {
  code: string
  message: string
  messageEn: string
  retryable: boolean
  /** Internal error that should trigger re-authentication */
  requiresReauth?: boolean
}

const ERROR_MAP: Record<string, IBncErrorInfo> = {
  // ─────────────────────────────────────────────────────────────────────────
  // C2P (Cobro a Persona) errors
  // ─────────────────────────────────────────────────────────────────────────
  G13: {
    code: 'G13',
    message: 'Transacción inválida',
    messageEn: 'Invalid transaction',
    retryable: false,
  },
  G41: {
    code: 'G41',
    message: 'Tarjeta reportada como perdida',
    messageEn: 'Card reported as lost',
    retryable: false,
  },
  G43: {
    code: 'G43',
    message: 'Tarjeta reportada como robada',
    messageEn: 'Card reported as stolen',
    retryable: false,
  },
  G55: {
    code: 'G55',
    message: 'PIN incorrecto',
    messageEn: 'Incorrect PIN',
    retryable: true,
  },
  G56: {
    code: 'G56',
    message: 'Teléfono o tarjeta no registrada en pago móvil',
    messageEn: 'Phone or card not registered for mobile payment',
    retryable: false,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Pago Móvil (P2P) errors
  // ─────────────────────────────────────────────────────────────────────────
  G05: {
    code: 'G05',
    message: 'Error de comunicación, intente más tarde',
    messageEn: 'Communication error, try again later',
    retryable: true,
  },
  G12: {
    code: 'G12',
    message: 'Error de comunicación con el banco',
    messageEn: 'Bank communication error',
    retryable: true,
  },
  G14: {
    code: 'G14',
    message: 'Beneficiario puede no estar afiliado',
    messageEn: 'Beneficiary may not be enrolled',
    retryable: false,
  },
  G51: {
    code: 'G51',
    message: 'Fondos insuficientes',
    messageEn: 'Insufficient funds',
    retryable: false,
  },
  G52: {
    code: 'G52',
    message: 'Beneficiario no afiliado a pago móvil',
    messageEn: 'Beneficiary not enrolled in mobile payment',
    retryable: false,
  },
  G61: {
    code: 'G61',
    message: 'Límite diario de monto excedido',
    messageEn: 'Daily amount limit exceeded',
    retryable: false,
  },
  G62: {
    code: 'G62',
    message: 'Beneficiario restringido',
    messageEn: 'Beneficiary restricted',
    retryable: false,
  },
  G65: {
    code: 'G65',
    message: 'Límite diario de transacciones excedido',
    messageEn: 'Daily transaction count limit exceeded',
    retryable: false,
  },
  G80: {
    code: 'G80',
    message: 'Cédula del beneficiario inválida',
    messageEn: 'Invalid beneficiary ID',
    retryable: false,
  },
  G91: {
    code: 'G91',
    message: 'Banco emisor inoperante, intente más tarde',
    messageEn: 'Issuing bank inoperative, try again later',
    retryable: true,
  },
  G96: {
    code: 'G96',
    message: 'Error del sistema, intente más tarde',
    messageEn: 'System malfunction, try again later',
    retryable: true,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // VPOS (Card) errors
  // ─────────────────────────────────────────────────────────────────────────
  G00: {
    code: 'G00',
    message: 'Transacción aprobada',
    messageEn: 'Transaction approved',
    retryable: false,
  },
  CO1: {
    code: 'CO1',
    message: 'Comercio no existe',
    messageEn: 'Merchant does not exist',
    retryable: false,
  },
  G54: {
    code: 'G54',
    message: 'Tarjeta expirada',
    messageEn: 'Expired card',
    retryable: false,
  },
  G94: {
    code: 'G94',
    message: 'Transacción duplicada',
    messageEn: 'Duplicate transaction',
    retryable: false,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // EPI (General/Platform) errors
  // ─────────────────────────────────────────────────────────────────────────
  EPICNF: {
    code: 'EPICNF',
    message: 'Cliente no encontrado o inactivo',
    messageEn: 'Client not found or inactive',
    retryable: false,
  },
  EPIRWK: {
    code: 'EPIRWK',
    message: 'Sesión de seguridad expirada',
    messageEn: 'Security session expired',
    retryable: true,
    requiresReauth: true,
  },
  EPIONA: {
    code: 'EPIONA',
    message: 'Permisos insuficientes',
    messageEn: 'Insufficient permissions',
    retryable: false,
  },
  EPIIMS: {
    code: 'EPIIMS',
    message: 'Datos de la solicitud inválidos',
    messageEn: 'Invalid request data',
    retryable: false,
  },
  EPIHV: {
    code: 'EPIHV',
    message: 'Validación de integridad fallida',
    messageEn: 'Integrity validation failed',
    retryable: false,
  },
  EPICCA: {
    code: 'EPICCA',
    message: 'Error de comunicación, intente más tarde',
    messageEn: 'Communication error, try again later',
    retryable: true,
  },
  EPIE00: {
    code: 'EPIE00',
    message: 'Error interno del banco, intente más tarde',
    messageEn: 'Internal bank error, try again later',
    retryable: true,
  },
  EPIE03: {
    code: 'EPIE03',
    message: 'Error de validación en la solicitud',
    messageEn: 'Request validation exception',
    retryable: false,
  },
  EPIMC1: {
    code: 'EPIMC1',
    message: 'Sin permisos para esta operación',
    messageEn: 'No permissions for this operation',
    retryable: false,
  },
  EPIMC2: {
    code: 'EPIMC2',
    message: 'Comercio no encontrado',
    messageEn: 'Merchant not found',
    retryable: false,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // ISO / Immediate Debit errors
  // ─────────────────────────────────────────────────────────────────────────
  AC00: {
    code: 'AC00',
    message: 'Esperando respuesta del banco',
    messageEn: 'Awaiting bank response',
    retryable: true,
  },
  AB01: {
    code: 'AB01',
    message: 'Tiempo de espera agotado',
    messageEn: 'Request timeout',
    retryable: true,
  },
  AC01: {
    code: 'AC01',
    message: 'Cuenta inválida',
    messageEn: 'Invalid account',
    retryable: false,
  },
  AC04: {
    code: 'AC04',
    message: 'Cuenta cancelada',
    messageEn: 'Account cancelled',
    retryable: false,
  },
  AM02: {
    code: 'AM02',
    message: 'Monto no permitido',
    messageEn: 'Amount not permitted',
    retryable: false,
  },
  AM04: {
    code: 'AM04',
    message: 'Saldo insuficiente',
    messageEn: 'Insufficient balance',
    retryable: false,
  },
  AM05: {
    code: 'AM05',
    message: 'Operación duplicada',
    messageEn: 'Duplicate operation',
    retryable: false,
  },
  DU01: {
    code: 'DU01',
    message: 'Mensaje duplicado',
    messageEn: 'Duplicate message ID',
    retryable: false,
  },
  RJCT: {
    code: 'RJCT',
    message: 'Transacción rechazada',
    messageEn: 'Transaction rejected',
    retryable: false,
  },
  ACCP: {
    code: 'ACCP',
    message: 'Transacción aceptada',
    messageEn: 'Transaction accepted',
    retryable: false,
  },
  TKCM: {
    code: 'TKCM',
    message: 'Código de débito único incorrecto',
    messageEn: 'Incorrect unique debit code',
    retryable: false,
  },
}

const DEFAULT_ERROR: IBncErrorInfo = {
  code: 'UNKNOWN',
  message: 'Error desconocido del banco, intente más tarde',
  messageEn: 'Unknown bank error, try again later',
  retryable: false,
}

/**
 * Extracts the error code from a BNC response message.
 * BNC format: "CODE description" (e.g., "G51 Insufficient funds")
 */
export function extractErrorCode(message: string): string {
  const trimmed = message.trim()
  const spaceIndex = trimmed.indexOf(' ')

  return spaceIndex > 0 ? trimmed.substring(0, spaceIndex) : trimmed
}

/**
 * Gets error info for a BNC error code.
 * Falls back to a generic error if code is unknown.
 */
export function getBncError(code: string): IBncErrorInfo {
  return ERROR_MAP[code] ?? { ...DEFAULT_ERROR, code }
}

/**
 * Gets a user-friendly error message from a BNC response message string.
 *
 * @param bncMessage - The raw message from BNC response (e.g., "G51 Insufficient funds")
 * @param locale - 'es' or 'en' (default: 'es')
 */
export function getBncErrorMessage(bncMessage: string, locale: 'es' | 'en' = 'es'): string {
  const code = extractErrorCode(bncMessage)
  const error = getBncError(code)

  return locale === 'en' ? error.messageEn : error.message
}

/**
 * Checks if a BNC error code requires re-authentication (EPIRWK).
 */
export function requiresReauth(code: string): boolean {
  return ERROR_MAP[code]?.requiresReauth === true
}

/**
 * Checks if a BNC error is retryable (transient failure).
 */
export function isRetryableError(code: string): boolean {
  return ERROR_MAP[code]?.retryable === true
}
