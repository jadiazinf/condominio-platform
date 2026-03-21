'use client'

import Link from 'next/link'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'

import type { IPaymentWizardState } from '../PaymentWizardClient'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Button } from '@/ui/components/button'

interface ResultStepProps {
  state: IPaymentWizardState
  onPayMore: () => void
  onTryAgain: () => void
}

export function ResultStep({ state, onPayMore, onTryAgain }: ResultStepProps) {
  const { t } = useTranslation()
  const p = 'resident.pay.result'

  const result = state.paymentResult
  const error = state.paymentError

  // Determine result type
  const isSuccess = result?.status === 'completed'
  const isPending = result?.status === 'pending_verification'
  const isFailed = !!error || result?.status === 'failed'

  return (
    <div className="flex flex-col items-center py-8 text-center">
      {/* Icon */}
      {isSuccess && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success-100 dark:bg-success-900/30">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>
      )}
      {isPending && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning-100 dark:bg-warning-900/30">
          <Clock className="h-8 w-8 text-warning" />
        </div>
      )}
      {isFailed && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-danger-100 dark:bg-danger-900/30">
          <XCircle className="h-8 w-8 text-danger" />
        </div>
      )}

      {/* Title */}
      <Typography className="mb-2" variant="h3">
        {isSuccess && t(`${p}.successTitle`)}
        {isPending && t(`${p}.pendingTitle`)}
        {isFailed && t(`${p}.failedTitle`)}
      </Typography>

      {/* Message */}
      <Typography className="mb-6 max-w-md" color="muted" variant="body2">
        {isSuccess && t(`${p}.successMessage`)}
        {isPending && t(`${p}.pendingMessage`)}
        {isFailed && (error || t(`${p}.failedMessage`))}
      </Typography>

      {/* Payment details */}
      {result && (
        <div className="mb-6 w-full max-w-sm rounded-lg bg-default-50 p-4 dark:bg-default-100/50">
          {result.payment?.paymentNumber && (
            <div className="flex justify-between text-sm">
              <span className="text-default-500">{t(`${p}.paymentNumber`)}</span>
              <span className="font-medium">{result.payment.paymentNumber}</span>
            </div>
          )}
          {result.externalTransactionId && (
            <div className="mt-1 flex justify-between text-sm">
              <span className="text-default-500">{t(`${p}.transactionId`)}</span>
              <span className="font-medium">{result.externalTransactionId}</span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        {isFailed && (
          <Button color="primary" onPress={onTryAgain}>
            {t(`${p}.tryAgain`)}
          </Button>
        )}
        <Button
          as={Link}
          color={isFailed ? 'default' : 'primary'}
          href="/dashboard/my-payments"
          variant={isFailed ? 'flat' : 'solid'}
        >
          {t(`${p}.viewPayments`)}
        </Button>
        {!isFailed && (
          <Button variant="flat" onPress={onPayMore}>
            {t(`${p}.payMore`)}
          </Button>
        )}
      </div>
    </div>
  )
}
