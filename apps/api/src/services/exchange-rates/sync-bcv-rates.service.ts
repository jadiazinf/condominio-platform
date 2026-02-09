import * as cheerio from 'cheerio'
import type { TCurrency } from '@packages/domain'
import { CurrenciesRepository, ExchangeRatesRepository } from '@database/repositories'
import type { TDrizzleClient } from '@database/repositories/interfaces'
import logger from '@utils/logger'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const BCV_URL = 'https://www.bcv.org.ve/'
const BCV_SOURCE = 'BCV'

const BCV_CURRENCY_MAP = {
  dolar: { code: 'USD', name: 'Dólar Estadounidense', symbol: '$', decimals: 2 },
  euro: { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
  yuan: { code: 'CNY', name: 'Yuan Chino', symbol: '¥', decimals: 2 },
  lira: { code: 'TRY', name: 'Lira Turca', symbol: '₺', decimals: 2 },
  rublo: { code: 'RUB', name: 'Rublo Ruso', symbol: '₽', decimals: 2 },
} as const

const VES_METADATA = {
  code: 'VES',
  name: 'Bolívar',
  symbol: 'Bs.',
  decimals: 2,
  isBaseCurrency: true,
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface IBcvScrapedRate {
  currencyCode: string
  rate: string
  effectiveDate: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export class SyncBcvRatesService {
  private readonly db: TDrizzleClient
  private currenciesRepo: CurrenciesRepository
  private exchangeRatesRepo: ExchangeRatesRepository

  constructor(db: TDrizzleClient) {
    this.db = db
    this.currenciesRepo = new CurrenciesRepository(db)
    this.exchangeRatesRepo = new ExchangeRatesRepository(db)
  }

  async execute(): Promise<void> {
    // Scraping is a read/external operation — stays outside transaction
    const scrapedRates = await this.scrapeBcv()

    if (scrapedRates.length === 0) {
      logger.warn('[BCV Sync] No rates scraped from BCV page')
      return
    }

    logger.info({ count: scrapedRates.length }, '[BCV Sync] Scraped rates from BCV')

    // All database writes inside a transaction for atomicity
    await this.db.transaction(async (tx) => {
      const txCurrenciesRepo = this.currenciesRepo.withTx(tx)
      const txExchangeRatesRepo = this.exchangeRatesRepo.withTx(tx)

      const vesCurrency = await this.ensureCurrencyWithRepo(txCurrenciesRepo, VES_METADATA)

      for (const scraped of scrapedRates) {
        await this.processSingleRateWithRepos(txCurrenciesRepo, txExchangeRatesRepo, scraped, vesCurrency)
      }
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Scraping
  // ─────────────────────────────────────────────────────────────────────────

  private async scrapeBcv(): Promise<IBcvScrapedRate[]> {
    const response = await fetch(BCV_URL, {
      headers: {
        'User-Agent': 'CondominioApp/1.0',
        Accept: 'text/html',
      },
      // BCV uses a certificate chain that can't be verified
      tls: { rejectUnauthorized: false },
    })

    if (!response.ok) {
      throw new Error(`BCV fetch failed: HTTP ${response.status}`)
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Extract effective date from span content attribute
    const dateContent = $('span.date-display-single').attr('content')
    if (!dateContent) {
      throw new Error('Could not find effective date on BCV page')
    }
    const effectiveDate = dateContent.substring(0, 10) // "YYYY-MM-DD"

    const rates: IBcvScrapedRate[] = []

    for (const [divId, meta] of Object.entries(BCV_CURRENCY_MAP)) {
      const rawText = $(`div#${divId} .centrado strong`).text().trim()
      if (!rawText) {
        logger.warn({ divId, code: meta.code }, '[BCV Sync] Rate not found for currency')
        continue
      }

      // Convert "451,87667684" -> "451.87667684"
      const rate = rawText.replace(',', '.')

      if (isNaN(Number(rate))) {
        logger.warn({ divId, rawText, code: meta.code }, '[BCV Sync] Invalid rate value')
        continue
      }

      rates.push({ currencyCode: meta.code, rate, effectiveDate })
    }

    return rates
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Currency ensure
  // ─────────────────────────────────────────────────────────────────────────

  private async ensureCurrencyWithRepo(
    currenciesRepo: CurrenciesRepository,
    meta: {
      code: string
      name: string
      symbol: string
      decimals: number
      isBaseCurrency?: boolean
    }
  ): Promise<TCurrency> {
    const existing = await currenciesRepo.getByCode(meta.code)
    if (existing) return existing

    logger.info({ code: meta.code }, '[BCV Sync] Creating currency')
    return currenciesRepo.create({
      code: meta.code,
      name: meta.name,
      symbol: meta.symbol,
      decimals: meta.decimals,
      isBaseCurrency: meta.isBaseCurrency ?? false,
      isActive: true,
      registeredBy: null,
    })
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Rate processing
  // ─────────────────────────────────────────────────────────────────────────

  private async processSingleRateWithRepos(
    currenciesRepo: CurrenciesRepository,
    exchangeRatesRepo: ExchangeRatesRepository,
    scraped: IBcvScrapedRate,
    vesCurrency: TCurrency
  ): Promise<void> {
    const meta = Object.values(BCV_CURRENCY_MAP).find((m) => m.code === scraped.currencyCode)
    if (!meta) return

    const fromCurrency = await this.ensureCurrencyWithRepo(currenciesRepo, meta)

    const latestRate = await exchangeRatesRepo.getLatestRate(fromCurrency.id, vesCurrency.id)

    if (latestRate) {
      const sameRate = latestRate.rate === scraped.rate

      if (sameRate) {
        logger.debug(
          { code: scraped.currencyCode, rate: scraped.rate },
          '[BCV Sync] Rate unchanged, skipping'
        )
        return
      }

      // Rate changed - deactivate the previous record
      logger.info(
        { code: scraped.currencyCode, oldRate: latestRate.rate, newRate: scraped.rate },
        '[BCV Sync] Rate changed, deactivating previous'
      )
      await exchangeRatesRepo.delete(latestRate.id)
    }

    logger.info(
      { code: scraped.currencyCode, rate: scraped.rate, date: scraped.effectiveDate },
      '[BCV Sync] Inserting exchange rate'
    )

    await exchangeRatesRepo.create({
      fromCurrencyId: fromCurrency.id,
      toCurrencyId: vesCurrency.id,
      rate: scraped.rate,
      effectiveDate: scraped.effectiveDate,
      source: BCV_SOURCE,
      isActive: true,
      createdBy: null,
      registeredBy: null,
    })
  }
}
