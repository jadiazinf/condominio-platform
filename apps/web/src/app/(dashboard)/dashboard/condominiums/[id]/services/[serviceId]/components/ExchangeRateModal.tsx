'use client'

import { useMemo } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Typography } from '@/ui/components/typography'
import { Spinner } from '@/ui/components/spinner'
import { ArrowRight, Calendar, Info } from 'lucide-react'
import { useTranslation } from '@/contexts'
import { useMyEffectiveExchangeRates } from '@packages/http-client/hooks'
import type { TCurrency } from '@packages/domain'

interface ExchangeRateModalProps {
  isOpen: boolean
  onClose: () => void
  totalAmount: string
  currencyId: string
  executionDate: string
  currencies: TCurrency[]
}

export function ExchangeRateModal({
  isOpen,
  onClose,
  totalAmount,
  currencyId,
  executionDate,
  currencies,
}: ExchangeRateModalProps) {
  const { t } = useTranslation()
  const w = 'admin.condominiums.detail.services.detail.exchangeRateModal'

  const { data: ratesResponse, isLoading } = useMyEffectiveExchangeRates(
    executionDate,
    { enabled: isOpen && !!executionDate }
  )
  const rates = useMemo(() => ratesResponse?.data ?? [], [ratesResponse])

  const sourceCurrency = useMemo(
    () => currencies.find(c => c.id === currencyId),
    [currencies, currencyId]
  )

  const amount = Number(totalAmount)
  const sourceSymbol = sourceCurrency?.symbol || sourceCurrency?.code || ''

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-')
    if (!year || !month || !day) return dateStr
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const conversions = useMemo(() => {
    return currencies
      .filter(c => c.id !== currencyId && c.isActive)
      .map(targetCurrency => {
        // Try direct rate: source -> target
        const directRate = rates.find(
          r => r.fromCurrencyId === currencyId && r.toCurrencyId === targetCurrency.id
        )
        if (directRate) {
          const rate = Number(directRate.rate)
          return {
            currency: targetCurrency,
            convertedAmount: amount / rate,
            displayRate: `1 ${targetCurrency.code} = ${rate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${sourceCurrency?.code}`,
            effectiveDate: directRate.effectiveDate,
            source: directRate.source,
            available: true,
          }
        }

        // Try inverse rate: target -> source
        const inverseRate = rates.find(
          r => r.fromCurrencyId === targetCurrency.id && r.toCurrencyId === currencyId
        )
        if (inverseRate) {
          const rate = Number(inverseRate.rate)
          return {
            currency: targetCurrency,
            convertedAmount: amount / rate,
            displayRate: `1 ${targetCurrency.code} = ${rate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${sourceCurrency?.code}`,
            effectiveDate: inverseRate.effectiveDate,
            source: inverseRate.source,
            available: true,
          }
        }

        return {
          currency: targetCurrency,
          convertedAmount: 0,
          displayRate: '',
          effectiveDate: '',
          source: null as string | null,
          available: false,
        }
      })
      .filter(c => c.available)
  }, [currencies, currencyId, rates, amount, sourceCurrency])

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalContent>
        <ModalHeader>
          <Typography variant="h4">{t(`${w}.title`)}</Typography>
        </ModalHeader>

        <ModalBody className="flex flex-col gap-4">
          {/* Original amount */}
          <div className="rounded-lg bg-default-50 p-4 text-center">
            <Typography variant="caption" color="muted">{t(`${w}.originalAmount`)}</Typography>
            <Typography variant="h3">
              {sourceSymbol} {amount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </Typography>
            <div className="flex items-center justify-center gap-1 mt-1">
              <Calendar size={12} className="text-default-400" />
              <Typography variant="caption" color="muted">
                {formatDate(executionDate)}
              </Typography>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : conversions.length === 0 ? (
            <div className="rounded-lg bg-warning-50 p-4 text-center">
              <Typography variant="body2" className="text-warning-700">
                {t(`${w}.noConversions`)}
              </Typography>
            </div>
          ) : (
            <div className="space-y-2">
              {conversions.map(conv => {
                const targetSymbol = conv.currency.symbol || conv.currency.code
                return (
                  <div key={conv.currency.id} className="rounded-lg border border-default-200 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ArrowRight size={14} className="text-default-400" />
                        <Typography variant="body2" className="font-semibold">
                          {conv.currency.code}
                        </Typography>
                      </div>
                      <Typography variant="body2" className="font-mono font-semibold">
                        {targetSymbol} {conv.convertedAmount.toLocaleString('es-VE', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </Typography>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <Typography variant="caption" color="muted">
                        {conv.displayRate}
                      </Typography>
                      {conv.source && (
                        <Typography variant="caption" color="muted">
                          ({conv.source})
                        </Typography>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg bg-primary-50 p-3">
            <Info size={14} className="text-primary mt-0.5 shrink-0" />
            <Typography variant="caption" className="text-primary-700">
              {t(`${w}.historicalNote`)}
            </Typography>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button variant="flat" onPress={onClose}>
            {t(`${w}.close`)}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
