'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { CurrencyInput } from '@/ui/components/input'
import { Select, type ISelectItem } from '@/ui/components/select'
import { Typography } from '@/ui/components/typography'
import { Spinner } from '@/ui/components/spinner'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from '@/contexts'
import { useMyLatestExchangeRates } from '@packages/http-client'

interface CurrencyCalculatorModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (convertedAmount: string) => void
  targetCurrencyId: string
  currencies: Array<{ id: string; code: string; symbol?: string | null; name?: string }>
}

export function CurrencyCalculatorModal({
  isOpen,
  onClose,
  onConfirm,
  targetCurrencyId,
  currencies,
}: CurrencyCalculatorModalProps) {
  const { t } = useTranslation()
  const w = 'admin.condominiums.detail.paymentConcepts.wizard.assignments.calculator'

  const [sourceCurrencyId, setSourceCurrencyId] = useState<string>('')
  const [sourceAmount, setSourceAmount] = useState<string>('')

  const { data: ratesResponse, isLoading } = useMyLatestExchangeRates({ enabled: isOpen })
  const rates = useMemo(() => ratesResponse?.data ?? [], [ratesResponse])

  const targetCurrency = useMemo(
    () => currencies.find(c => c.id === targetCurrencyId),
    [currencies, targetCurrencyId]
  )

  // Filter source currencies: all except the target, that have a rate to/from target
  const sourceCurrencyItems: ISelectItem[] = useMemo(() => {
    return currencies
      .filter(c => c.id !== targetCurrencyId)
      .filter(c => {
        // Check if there's a rate from this currency to target or vice-versa
        return rates.some(
          r =>
            (r.fromCurrencyId === c.id && r.toCurrencyId === targetCurrencyId) ||
            (r.fromCurrencyId === targetCurrencyId && r.toCurrencyId === c.id)
        )
      })
      .map(c => ({ key: c.id, label: c.name ? `${c.code} — ${c.name}` : c.code }))
  }, [currencies, targetCurrencyId, rates])

  // Auto-select source currency: prefer USD, fallback to first available
  const defaultSourceId = useMemo(() => {
    const usdItem = sourceCurrencyItems.find(item => {
      const cur = currencies.find(c => c.id === item.key)
      return cur?.code === 'USD'
    })
    return usdItem?.key || sourceCurrencyItems[0]?.key || ''
  }, [sourceCurrencyItems, currencies])

  const effectiveSourceId = sourceCurrencyId || defaultSourceId

  const sourceCurrency = useMemo(
    () => currencies.find(c => c.id === effectiveSourceId),
    [currencies, effectiveSourceId]
  )

  // Find the exchange rate
  const rateInfo = useMemo(() => {
    if (!effectiveSourceId || !targetCurrencyId) return null

    const directRate = rates.find(
      r => r.fromCurrencyId === effectiveSourceId && r.toCurrencyId === targetCurrencyId
    )
    if (directRate) {
      return {
        rate: Number(directRate.rate),
        effectiveDate: directRate.effectiveDate,
        source: directRate.source,
        isDirect: true,
      }
    }

    const inverseRate = rates.find(
      r => r.fromCurrencyId === targetCurrencyId && r.toCurrencyId === effectiveSourceId
    )
    if (inverseRate) {
      return {
        rate: 1 / Number(inverseRate.rate),
        effectiveDate: inverseRate.effectiveDate,
        source: inverseRate.source,
        isDirect: false,
      }
    }

    return null
  }, [effectiveSourceId, targetCurrencyId, rates])

  // Calculate result
  const result = useMemo(() => {
    if (!rateInfo || !sourceAmount) return null
    const amount = Number(sourceAmount)
    if (!amount || amount <= 0) return null
    return amount * rateInfo.rate
  }, [rateInfo, sourceAmount])

  const sourceSymbol = sourceCurrency?.symbol || sourceCurrency?.code || ''
  const targetSymbol = targetCurrency?.symbol || targetCurrency?.code || ''

  const formattedResult = result != null
    ? `${targetSymbol} ${result.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : null

  const handleConfirm = useCallback(() => {
    if (result != null) {
      onConfirm(result.toFixed(2))
    }
  }, [result, onConfirm])

  const handleClose = useCallback(() => {
    setSourceAmount('')
    setSourceCurrencyId('')
    onClose()
  }, [onClose])

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalContent>
        <ModalHeader>
          <Typography variant="h4">{t(`${w}.title`)}</Typography>
        </ModalHeader>

        <ModalBody className="flex flex-col gap-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : rates.length === 0 ? (
            <div className="rounded-lg bg-warning-50 p-4 text-center">
              <Typography variant="body2" className="text-warning-700">
                {t(`${w}.noRates`)}
              </Typography>
            </div>
          ) : sourceCurrencyItems.length === 0 ? (
            <div className="rounded-lg bg-warning-50 p-4 text-center">
              <Typography variant="body2" className="text-warning-700">
                {t(`${w}.noPairRate`)}
              </Typography>
            </div>
          ) : (
            <>
              {/* Source currency selector */}
              <Select
                label={t(`${w}.sourceCurrency`)}
                placeholder={t(`${w}.sourceCurrencyPlaceholder`)}
                items={sourceCurrencyItems}
                value={effectiveSourceId}
                onChange={(key) => key && setSourceCurrencyId(key)}
                variant="bordered"
              />

              {/* Exchange rate info */}
              {rateInfo && sourceCurrency && targetCurrency && (
                <div className="flex flex-col gap-1 rounded-lg bg-default-50 p-3">
                  <div className="flex items-center gap-2">
                    <Typography variant="body2" className="font-semibold">
                      {t(`${w}.exchangeRate`)}
                    </Typography>
                  </div>
                  <Typography variant="body2">
                    {t(`${w}.rateInfo`, {
                      from: sourceCurrency.code,
                      rate: rateInfo.rate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 8 }),
                      to: targetCurrency.code,
                    })}
                  </Typography>
                  <div className="flex items-center gap-3">
                    {rateInfo.effectiveDate && (
                      <Typography variant="caption" color="muted">
                        {t(`${w}.rateDate`, { date: rateInfo.effectiveDate })}
                      </Typography>
                    )}
                    {rateInfo.source && (
                      <Typography variant="caption" color="muted">
                        {t(`${w}.rateSource`, { source: rateInfo.source })}
                      </Typography>
                    )}
                  </div>
                </div>
              )}

              {/* Source amount input */}
              <CurrencyInput
                label={t(`${w}.sourceAmount`, { currency: sourceCurrency?.code || '' })}
                placeholder="0.00"
                value={sourceAmount}
                onValueChange={setSourceAmount}
                currencySymbol={sourceSymbol ? <span className="text-default-400 text-sm">{sourceSymbol}</span> : undefined}
                showCurrencySymbol={!!sourceSymbol}
                variant="bordered"
              />

              {/* Result */}
              {formattedResult && (
                <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-success-200 bg-success-50 p-4">
                  <div className="flex items-center gap-2">
                    <Typography variant="caption" color="muted">
                      {t(`${w}.result`)}
                    </Typography>
                    <ArrowRight size={14} className="text-default-400" />
                  </div>
                  <Typography variant="h4" className="text-success-700">
                    {formattedResult}
                  </Typography>
                </div>
              )}
            </>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="flat" onPress={handleClose}>
            {t(`${w}.cancel`)}
          </Button>
          <Button
            color="primary"
            isDisabled={result == null}
            onPress={handleConfirm}
          >
            {formattedResult
              ? t(`${w}.apply`, { amount: formattedResult })
              : t(`${w}.apply`, { amount: '' })}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
