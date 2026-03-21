'use client'

import type { IPayableBankAccount } from '@packages/http-client'

import { useCallback } from 'react'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Chip } from '@/ui/components/chip'
import { Divider } from '@/ui/components/divider'
import { useToast } from '@/ui/components/toast'

interface BankAccountDetailModalProps {
  bankAccount: IPayableBankAccount | null
  isOpen: boolean
  onClose: () => void
}

export function BankAccountDetailModal({
  bankAccount,
  isOpen,
  onClose,
}: BankAccountDetailModalProps) {
  const { t } = useTranslation()
  const p = 'resident.pay.bankDetail'

  const toast = useToast()

  const handleCopy = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text).then(() => {
        toast.success(t(`${p}.copied`))
      })
    },
    [toast, t, p]
  )

  if (!bankAccount) return null

  const accountTypeKey = `${p}.accountTypes.${bankAccount.accountType}`
  const accountTypeLabel = t(accountTypeKey)
  const accountTypeDisplay =
    accountTypeLabel !== accountTypeKey ? accountTypeLabel : bankAccount.accountType

  return (
    <Modal isOpen={isOpen} size="md" onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center gap-2">
            <Typography variant="h4">{t(`${p}.title`)}</Typography>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="flex flex-col gap-4">
            {/* Bank name + BNC badge */}
            <div className="flex items-center justify-between">
              <Typography className="font-semibold" variant="body1">
                {bankAccount.bankName}
              </Typography>
              {bankAccount.isBnc && (
                <Chip color="success" size="sm" variant="flat">
                  BNC
                </Chip>
              )}
            </div>

            <Divider />

            {/* Account details */}
            <div className="flex flex-col gap-3">
              {bankAccount.accountHolderName && (
                <CopyableField
                  label={t(`${p}.accountHolder`)}
                  value={bankAccount.accountHolderName}
                  onCopy={handleCopy}
                />
              )}

              {bankAccount.identityDocType && bankAccount.identityDocNumber && (
                <CopyableField
                  copyValue={`${bankAccount.identityDocType}${bankAccount.identityDocNumber}`}
                  label={t(`${p}.document`)}
                  value={`${bankAccount.identityDocType}-${bankAccount.identityDocNumber}`}
                  onCopy={handleCopy}
                />
              )}

              {bankAccount.accountNumber && (
                <CopyableField
                  copyValue={bankAccount.accountNumber}
                  label={t(`${p}.accountNumber`)}
                  value={formatAccountNumber(bankAccount.accountNumber)}
                  onCopy={handleCopy}
                />
              )}

              <Field label={t(`${p}.bankCode`)} value={bankAccount.bankCode} />

              <Field label={t(`${p}.accountType`)} value={accountTypeDisplay} />

              {bankAccount.phoneNumber && (
                <CopyableField
                  label={t(`${p}.phone`)}
                  value={bankAccount.phoneNumber}
                  onCopy={handleCopy}
                />
              )}
            </div>

            {/* Payment methods accepted */}
            {bankAccount.acceptedPaymentMethods.length > 0 && (
              <>
                <Divider />
                <div>
                  <Typography className="mb-2 text-sm text-default-500">
                    {t(`${p}.acceptedMethods`)}
                  </Typography>
                  <div className="flex flex-wrap gap-2">
                    {bankAccount.acceptedPaymentMethods.map(method => {
                      const key = `resident.pay.method.methods.${method}`
                      const label = t(key)

                      return (
                        <Chip key={method} size="sm" variant="flat">
                          {label !== key ? label : method}
                        </Chip>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="bordered" onPress={onClose}>
            {t('common.close')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Typography className="shrink-0 text-sm text-default-500">{label}</Typography>
      <Typography className="text-sm font-medium text-right">{value}</Typography>
    </div>
  )
}

function CopyableField({
  label,
  value,
  copyValue,
  onCopy,
}: {
  label: string
  value: string
  copyValue?: string
  onCopy: (text: string) => void
}) {
  const [copied, setCopied] = useState(false)

  const handleClick = useCallback(() => {
    const text = copyValue ?? value

    onCopy(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [copyValue, value, onCopy])

  return (
    <div className="flex items-center justify-between gap-4">
      <Typography className="shrink-0 text-sm text-default-500">{label}</Typography>
      <div className="flex items-center gap-1.5">
        <Typography className="text-sm font-medium text-right">{value}</Typography>
        <button
          className="rounded p-1 text-default-400 transition-colors hover:bg-default-100 hover:text-default-600"
          title="Copiar"
          type="button"
          onClick={handleClick}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-success" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  )
}

function formatAccountNumber(accountNumber: string): string {
  if (!accountNumber) return ''

  return accountNumber.replace(/(.{4})/g, '$1 ').trim()
}
