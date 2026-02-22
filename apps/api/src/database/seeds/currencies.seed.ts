import { sql } from 'drizzle-orm'
import type { TDrizzleClient } from '../repositories/interfaces'

type TCurrencySeed = {
  code: string
  name: string
  symbol: string
  isBaseCurrency: boolean
  decimals: number
}

const CURRENCIES: TCurrencySeed[] = [
  { code: 'VES', name: 'Bolívar Venezolano', symbol: 'Bs.', isBaseCurrency: true, decimals: 2 },
  { code: 'USD', name: 'Dólar Estadounidense', symbol: '$', isBaseCurrency: false, decimals: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', isBaseCurrency: false, decimals: 2 },
  { code: 'COP', name: 'Peso Colombiano', symbol: 'COP', isBaseCurrency: false, decimals: 0 },
]

export async function seedCurrencies(db: TDrizzleClient): Promise<void> {
  for (const currency of CURRENCIES) {
    await db.execute(sql`
      INSERT INTO currencies (code, name, symbol, is_base_currency, is_active, decimals)
      VALUES (
        ${currency.code},
        ${currency.name},
        ${currency.symbol},
        ${currency.isBaseCurrency},
        true,
        ${currency.decimals}
      )
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        symbol = EXCLUDED.symbol,
        is_base_currency = EXCLUDED.is_base_currency,
        decimals = EXCLUDED.decimals
    `)
  }

  console.log(`[Seed] Upserted ${CURRENCIES.length} currencies (ON CONFLICT updates name, symbol, decimals)`)
}
