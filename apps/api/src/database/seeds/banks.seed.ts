import { sql } from 'drizzle-orm'
import type { TDrizzleClient } from '../repositories/interfaces'

type TBankSeed = {
  code: string
  name: string
  country: string
  accountCategory: 'national' | 'international'
  supportedPaymentMethods: string[]
}

// All Venezuelan banks support transfer, pago_movil, and interbancario
const VE_METHODS = ['transfer', 'pago_movil', 'interbancario']

const VENEZUELAN_BANKS: TBankSeed[] = [
  { code: '0102', name: 'Banco de Venezuela', country: 'VE', accountCategory: 'national', supportedPaymentMethods: VE_METHODS },
  { code: '0104', name: 'Venezolano de Crédito', country: 'VE', accountCategory: 'national', supportedPaymentMethods: VE_METHODS },
  { code: '0105', name: 'Mercantil', country: 'VE', accountCategory: 'national', supportedPaymentMethods: VE_METHODS },
  { code: '0108', name: 'Provincial (BBVA)', country: 'VE', accountCategory: 'national', supportedPaymentMethods: VE_METHODS },
  { code: '0114', name: 'Bancaribe', country: 'VE', accountCategory: 'national', supportedPaymentMethods: VE_METHODS },
  { code: '0115', name: 'Exterior', country: 'VE', accountCategory: 'national', supportedPaymentMethods: VE_METHODS },
  { code: '0128', name: 'Caroní', country: 'VE', accountCategory: 'national', supportedPaymentMethods: VE_METHODS },
  { code: '0134', name: 'Banesco', country: 'VE', accountCategory: 'national', supportedPaymentMethods: VE_METHODS },
  { code: '0137', name: 'Sofitasa', country: 'VE', accountCategory: 'national', supportedPaymentMethods: VE_METHODS },
  { code: '0138', name: 'Plaza', country: 'VE', accountCategory: 'national', supportedPaymentMethods: VE_METHODS },
  { code: '0146', name: 'Bangente', country: 'VE', accountCategory: 'national', supportedPaymentMethods: VE_METHODS },
  { code: '0151', name: 'BFC Banco Fondo Común', country: 'VE', accountCategory: 'national', supportedPaymentMethods: VE_METHODS },
  { code: '0156', name: '100% Banco', country: 'VE', accountCategory: 'national', supportedPaymentMethods: VE_METHODS },
  { code: '0157', name: 'Del Sur', country: 'VE', accountCategory: 'national', supportedPaymentMethods: VE_METHODS },
  { code: '0163', name: 'Banco del Tesoro', country: 'VE', accountCategory: 'national', supportedPaymentMethods: VE_METHODS },
  { code: '0166', name: 'Agrícola de Venezuela', country: 'VE', accountCategory: 'national', supportedPaymentMethods: VE_METHODS },
  { code: '0168', name: 'Bancrecer', country: 'VE', accountCategory: 'national', supportedPaymentMethods: VE_METHODS },
  { code: '0169', name: 'Mi Banco', country: 'VE', accountCategory: 'national', supportedPaymentMethods: VE_METHODS },
  { code: '0171', name: 'Activo', country: 'VE', accountCategory: 'national', supportedPaymentMethods: VE_METHODS },
  { code: '0172', name: 'Bancamiga', country: 'VE', accountCategory: 'national', supportedPaymentMethods: VE_METHODS },
  { code: '0174', name: 'Banplus', country: 'VE', accountCategory: 'national', supportedPaymentMethods: VE_METHODS },
  { code: '0175', name: 'Bicentenario', country: 'VE', accountCategory: 'national', supportedPaymentMethods: VE_METHODS },
  { code: '0177', name: 'Banfanb', country: 'VE', accountCategory: 'national', supportedPaymentMethods: VE_METHODS },
  { code: '0191', name: 'Nacional de Crédito (BNC)', country: 'VE', accountCategory: 'national', supportedPaymentMethods: VE_METHODS },
  { code: '0601', name: 'Instituto Municipal de Crédito Popular', country: 'VE', accountCategory: 'national', supportedPaymentMethods: VE_METHODS },
]

const INTERNATIONAL_BANKS: TBankSeed[] = [
  // US — Major Banks (most support wire, ACH, and Zelle)
  { code: 'BOFAUS3N', name: 'Bank of America', country: 'US', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer', 'ach', 'zelle'] },
  { code: 'CHASUS33', name: 'JPMorgan Chase', country: 'US', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer', 'ach', 'zelle'] },
  { code: 'WFBIUS6S', name: 'Wells Fargo', country: 'US', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer', 'ach', 'zelle'] },
  { code: 'CITIUS33', name: 'Citibank', country: 'US', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer', 'ach', 'zelle'] },
  { code: 'HIBKUS44', name: 'Capital One', country: 'US', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer', 'ach', 'zelle'] },
  { code: 'NRTHUS33', name: 'TD Bank', country: 'US', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer', 'ach', 'zelle'] },
  { code: 'PNCCUS33', name: 'PNC Bank', country: 'US', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer', 'ach', 'zelle'] },
  { code: 'USBKUS44', name: 'US Bank', country: 'US', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer', 'ach', 'zelle'] },
  { code: 'SNTRUS3A', name: 'Truist', country: 'US', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer', 'ach', 'zelle'] },
  { code: 'ALLYUS33', name: 'Ally Bank', country: 'US', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer', 'ach', 'zelle'] },
  // Charles Schwab — brokerage, no Zelle
  { code: 'SCHW', name: 'Charles Schwab', country: 'US', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer', 'ach'] },

  // US — Miami / Caribbean (Venezuelan diaspora)
  // Facebank — small community bank, no Zelle
  { code: 'FACEBANK', name: 'Facebank', country: 'US', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer', 'ach'] },
  { code: 'BNSCUSA', name: 'Banesco USA', country: 'US', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer', 'ach', 'zelle'] },
  { code: 'AMERANT', name: 'Amerant Bank', country: 'US', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer', 'ach', 'zelle'] },
  // Ocean Bank — small community bank, no Zelle
  { code: 'OCEANBNK', name: 'Ocean Bank', country: 'US', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer', 'ach'] },

  // Digital Banks & Fintech
  // Zinli — digital wallet, wire transfer only
  { code: 'ZINLI', name: 'Zinli', country: 'US', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer'] },
  // Mercury — business bank, no Zelle
  { code: 'MERCURY', name: 'Mercury', country: 'US', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer', 'ach'] },
  // Revolut — UK neobank, wire + wise
  { code: 'REVOLUT', name: 'Revolut', country: 'GB', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer', 'wise'] },
  // N26 — EU neobank, wire only
  { code: 'N26', name: 'N26', country: 'DE', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer'] },
  // Wise — their own platform + wire
  { code: 'TRWIGB2L', name: 'Wise (TransferWise)', country: 'GB', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer', 'wise'] },
  // Payoneer — wire only
  { code: 'PAYONEER', name: 'Payoneer', country: 'US', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer'] },

  // Panama Banks — wire transfer only
  { code: 'BNSCOPA', name: 'Banesco Panamá', country: 'PA', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer'] },
  { code: 'MERCPA', name: 'Mercantil Banco (Panamá)', country: 'PA', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer'] },
  { code: 'BAGEPAPA', name: 'Banco General', country: 'PA', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer'] },
  { code: 'GLBLPAPA', name: 'Global Bank', country: 'PA', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer'] },
  { code: 'BACINTL', name: 'BAC International Bank', country: 'PA', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer'] },

  // Spain Banks — wire transfer only
  { code: 'BBVAESMM', name: 'BBVA', country: 'ES', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer'] },
  { code: 'BSCHESMM', name: 'Santander', country: 'ES', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer'] },
  { code: 'CAIXABNK', name: 'CaixaBank', country: 'ES', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer'] },

  // Crypto Exchanges — crypto only
  { code: 'BINANCE', name: 'Binance', country: 'KY', accountCategory: 'international', supportedPaymentMethods: ['crypto'] },
  { code: 'COINBASE', name: 'Coinbase', country: 'US', accountCategory: 'international', supportedPaymentMethods: ['crypto'] },

  // Other International — wire transfer only
  { code: 'NOSCCATT', name: 'Scotiabank', country: 'CA', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer'] },
  { code: 'MRMDUS33', name: 'HSBC', country: 'US', accountCategory: 'international', supportedPaymentMethods: ['wire_transfer', 'ach'] },
]

export async function seedBanks(db: TDrizzleClient): Promise<void> {
  const allBanks = [...VENEZUELAN_BANKS, ...INTERNATIONAL_BANKS]

  for (const bank of allBanks) {
    const methodsLiteral = `{${bank.supportedPaymentMethods.join(',')}}`
    await db.execute(sql`
      INSERT INTO banks (name, code, country, account_category, supported_payment_methods, is_active)
      VALUES (
        ${bank.name},
        ${bank.code},
        ${bank.country},
        ${bank.accountCategory}::bank_account_category,
        ${methodsLiteral}::bank_payment_method[],
        true
      )
      ON CONFLICT (code, country) DO UPDATE SET
        supported_payment_methods = EXCLUDED.supported_payment_methods
    `)
  }

  console.log(`[Seed] Upserted ${allBanks.length} banks (ON CONFLICT updates supported_payment_methods)`)
}
