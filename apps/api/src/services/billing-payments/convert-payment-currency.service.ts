import { type TServiceResult, success, failure } from '../base.service'
import { parseAmount, toDecimal } from '@packages/utils/money'

type TExchangeRatesRepo = {
  getLatestRate: (fromCurrencyId: string, toCurrencyId: string, date?: string | null) => Promise<{
    id: string
    rate: string
  } | null>
}

export interface IConvertInput {
  paymentAmount: string
  paymentCurrencyId: string
  channelCurrencyId: string
  date?: string
}

export interface IConvertOutput {
  convertedAmount: string
  exchangeRateId: string | null
  isStaleRate: boolean
}

export class ConvertPaymentCurrencyService {
  private exchangeRatesRepo: TExchangeRatesRepo

  constructor(exchangeRatesRepo: TExchangeRatesRepo) {
    this.exchangeRatesRepo = exchangeRatesRepo
  }

  async execute(input: IConvertInput): Promise<TServiceResult<IConvertOutput>> {
    if (input.paymentCurrencyId === input.channelCurrencyId) {
      return success({
        convertedAmount: input.paymentAmount,
        exchangeRateId: null,
        isStaleRate: false,
      })
    }

    // Try today's rate
    const todayRate = await this.exchangeRatesRepo.getLatestRate(
      input.paymentCurrencyId,
      input.channelCurrencyId,
      input.date ?? new Date().toISOString().split('T')[0]
    )

    if (todayRate) {
      const converted = parseAmount(input.paymentAmount) / parseAmount(todayRate.rate)
      return success({
        convertedAmount: toDecimal(converted),
        exchangeRateId: todayRate.id,
        isStaleRate: false,
      })
    }

    // Fallback: latest known rate
    const fallbackRate = await this.exchangeRatesRepo.getLatestRate(
      input.paymentCurrencyId,
      input.channelCurrencyId,
      null
    )

    if (fallbackRate) {
      const converted = parseAmount(input.paymentAmount) / parseAmount(fallbackRate.rate)
      return success({
        convertedAmount: toDecimal(converted),
        exchangeRateId: fallbackRate.id,
        isStaleRate: true,
      })
    }

    return failure('No hay tasa de cambio disponible', 'BAD_REQUEST')
  }
}
