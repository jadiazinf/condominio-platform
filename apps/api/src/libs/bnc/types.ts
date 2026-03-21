/**
 * BNC ESolutions API v2.1 — Type definitions
 */

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface IBncConfig {
  baseUrl: string
  clientGUID: string
  masterKey: string
  terminal: string
  sandbox: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Request / Response Envelopes
// ─────────────────────────────────────────────────────────────────────────────

export interface IBncRequestEnvelope {
  ClientGUID: string
  Reference: string
  Value: string // AES-encrypted JSON
  Validation: string // SHA-256 hash
  swTestOperation: boolean
}

export interface IBncResponseEnvelope {
  status: 'OK' | 'KO'
  message: string
  value: string // AES-encrypted JSON (or empty)
  validation: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

export interface IBncAuthRequest {
  ClientGUID: string
}

// ─────────────────────────────────────────────────────────────────────────────
// C2P (Cobro a Persona)
// ─────────────────────────────────────────────────────────────────────────────

export interface IC2PRequest {
  DebtorBankCode: number
  DebtorCellPhone: string
  DebtorID: string // ID type + up to 9 digits (e.g., "V12345678")
  Amount: number // decimal(13,2)
  Token: string // 8-char OTP
  Terminal: string // 8-char terminal ID
  ChildClientID?: string
  BranchID?: string
}

export interface IC2PResponse {
  IdTransaction: number
  Reference: string // Authorization code
}

export interface IC2PReverseRequest {
  IdTransactionToReverse: number
  Amount: number
  Terminal: string
  ChildClientID?: string
  BranchID?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// VPOS (Virtual Point of Sale / Card Payments)
// ─────────────────────────────────────────────────────────────────────────────

export type TVPOSCardType = 1 | 2 | 3 // 1=VISA, 2=MasterCard, 3=Maestro Debit
export type TVPOSAccountType = 0 | 10 | 20 // 0=Principal, 10=Savings, 20=Checking

export interface IVPOSRequest {
  TransactionIdentifier: string // max 20 chars
  Amount: number // decimal(13,2)
  idCardType: TVPOSCardType
  CardNumber: number
  dtExpiration: number // Format: MMyyyy
  CardHolderName: string
  CardHolderID: number // max 9 digits
  AccountType: TVPOSAccountType
  CVV: number // 3 digits
  AffiliationNumber: number
  CardPIN?: number
  OperationRef?: string // max 40 chars, prevents duplicates
}

export interface IVPOSResponse {
  Reference: number
  Status: 'OK' | 'KO'
  Code: string
  Message: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Account Position / History
// ─────────────────────────────────────────────────────────────────────────────

export interface IAccountHistoryRequest {
  AccountNumber: string // 20 digits
  StartDate: string // yyyy-MM-dd
  EndDate: string // yyyy-MM-dd (max 31 days range)
  ClientID?: string
  ChildClientID?: string
  BranchID?: string
}

export interface IAccountHistoryEntry {
  Date: string
  ControlNumber: string
  Amount: number
  Code: string
  DebtorInstrument: string
  Concept: string
  BankCode: string
  Type: string
  BalanceDelta: 'Ingreso' | 'Egreso'
  ReferenceA: string
  ReferenceB: string
  ReferenceC: string
  ReferenceD: string
}

export interface IAccountBalanceRequest {
  ClientID: string
  ChildClientID?: string
  BranchID?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// BCV Exchange Rates
// ─────────────────────────────────────────────────────────────────────────────

export interface IBCVRatesResponse {
  PriceRateBCV: number
  dtRate: string // dd/MM/yyyy
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook (NotificationPush V2.0)
// ─────────────────────────────────────────────────────────────────────────────

export type TBncPaymentType = 'P2P' | 'TRF' | 'DEP'

export interface IBncWebhookPayload {
  PaymentType: TBncPaymentType
  OriginBankReference: string
  DestinyBankReference: string
  OriginBankCode: string // 4 digits
  Hour: string // HHMM military format
  CurrencyCode: string
  Amount: string // 15 digits + 2 decimal
  Date: string // yyyyMMdd
  CommerceID: string // Receiver's RIF
  // P2P-specific
  ClientPhone?: string
  CommercePhone?: string
  Concept?: string
  ClientID?: string
  // TRF/DEP-specific
  DebtorAccount?: string
  DebtorID?: string
  CreditorAccount?: string
}
