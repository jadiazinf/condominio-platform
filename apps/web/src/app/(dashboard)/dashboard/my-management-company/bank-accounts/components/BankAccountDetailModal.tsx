'use client'

import { useState, useCallback } from 'react'
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { Chip } from '@/ui/components/chip'
import { Typography } from '@/ui/components/typography'
import { useTranslation } from '@/contexts'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/ui/components/toast'
import { useDeactivateBankAccount, useMyCompanyBankAccountDetail, bankAccountKeys, useQueryClient } from '@packages/http-client'
import { PAYMENT_METHOD_LABELS } from '@packages/domain'
import type { TBankAccount } from '@packages/domain'
import { Eye, EyeOff } from 'lucide-react'

interface BankAccountDetailModalProps {
  isOpen: boolean
  onClose: () => void
  bankAccount: TBankAccount
  managementCompanyId: string
  isAdmin: boolean
}

export function BankAccountDetailModal({
  isOpen,
  onClose,
  bankAccount,
  managementCompanyId,
  isAdmin,
}: BankAccountDetailModalProps) {
  const { t } = useTranslation()
  const { verifyPassword } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)

  // Account number reveal state
  const [showAccountNumber, setShowAccountNumber] = useState(false)
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false)
  const [password, setPassword] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  // Fetch full detail (includes creator/deactivator info)
  const { data: detailData } = useMyCompanyBankAccountDetail({
    bankAccountId: bankAccount.id,
    companyId: managementCompanyId,
    enabled: isOpen,
  })
  const account = detailData?.data ?? bankAccount

  const { mutateAsync: deactivate } = useDeactivateBankAccount(managementCompanyId)

  const handleDeactivate = useCallback(async () => {
    setIsDeactivating(true)
    try {
      await deactivate({ bankAccountId: bankAccount.id })
      await queryClient.invalidateQueries({ queryKey: bankAccountKeys.all })
      toast.success(t('admin.company.myCompany.bankAccounts.detail.deactivateSuccess'))
      onClose()
    } catch {
      // Error handled by mutation
    } finally {
      setIsDeactivating(false)
      setShowDeactivateConfirm(false)
    }
  }, [deactivate, bankAccount.id, queryClient, onClose, toast, t])

  const handleToggleAccountNumber = useCallback(() => {
    if (showAccountNumber) {
      setShowAccountNumber(false)
    } else {
      setShowPasswordPrompt(true)
    }
  }, [showAccountNumber])

  const handlePasswordVerify = useCallback(async () => {
    setIsVerifying(true)
    try {
      const isValid = await verifyPassword(password)
      if (isValid) {
        setShowAccountNumber(true)
        setShowPasswordPrompt(false)
        setPassword('')
      } else {
        toast.error(t('admin.company.myCompany.bankAccounts.detail.wrongPassword'))
      }
    } catch {
      toast.error(t('admin.company.myCompany.bankAccounts.detail.wrongPassword'))
    } finally {
      setIsVerifying(false)
    }
  }, [password, verifyPassword, toast, t])

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('es-VE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const details = account.accountDetails as Record<string, unknown>

  const renderDetailRow = (label: string, value: string | null | undefined) => {
    if (!value) return null
    return (
      <div className="flex justify-between py-1.5 border-b border-default-100 last:border-b-0">
        <span className="text-sm text-default-500">{label}</span>
        <span className="text-sm font-medium">{value}</span>
      </div>
    )
  }

  const renderAccountNumberRow = (accountNum: string) => (
    <div className="flex justify-between items-center py-1.5 border-b border-default-100">
      <span className="text-sm text-default-500">
        {t('admin.company.myCompany.bankAccounts.wizard.accountNumber')}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium font-mono">
          {showAccountNumber ? accountNum : `****${accountNum.slice(-4)}`}
        </span>
        <button
          type="button"
          className="text-default-400 hover:text-foreground cursor-pointer transition-colors p-0.5"
          onClick={handleToggleAccountNumber}
        >
          {showAccountNumber ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  )

  const formatUserName = (user?: { displayName: string | null; email: string }) => {
    if (!user) return null
    return user.displayName || user.email
  }

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <Typography variant="h4">{account.displayName}</Typography>
            <Chip
              color={account.accountCategory === 'national' ? 'primary' : 'secondary'}
              variant="flat"
              size="sm"
            >
              {account.accountCategory === 'national'
                ? t('admin.company.myCompany.bankAccounts.national')
                : t('admin.company.myCompany.bankAccounts.international')}
            </Chip>
            <Chip
              color={account.isActive ? 'success' : 'default'}
              variant="dot"
              size="sm"
            >
              {account.isActive
                ? t('admin.company.myCompany.bankAccounts.active')
                : t('admin.company.myCompany.bankAccounts.inactive')}
            </Chip>
          </div>
        </ModalHeader>

        <ModalBody>
          <div className="space-y-6">
            {/* Bank Details Section */}
            <div>
              <Typography variant="body1" className="font-semibold mb-3">
                {t('admin.company.myCompany.bankAccounts.detail.accountDetails')}
              </Typography>
              <div className="rounded-lg bg-default-50 p-4">
                {renderDetailRow(
                  t('admin.company.myCompany.bankAccounts.columns.bankName'),
                  account.bankName
                )}
                {account.accountCategory === 'national' && renderDetailRow(
                  t('admin.company.myCompany.bankAccounts.wizard.bankCode'),
                  details.bankCode as string | undefined
                )}
                {renderDetailRow(
                  t('admin.company.myCompany.bankAccounts.wizard.accountHolderName'),
                  account.accountHolderName
                )}
                {renderDetailRow(
                  t('admin.company.myCompany.bankAccounts.columns.currency'),
                  account.currency
                )}

                {/* National-specific details */}
                {account.accountCategory === 'national' && (
                  <>
                    {details.accountNumber && renderAccountNumberRow(String(details.accountNumber))}
                    {renderDetailRow(
                      t('admin.company.myCompany.bankAccounts.wizard.accountType'),
                      details.accountType as string | undefined
                    )}
                    {renderDetailRow(
                      t('admin.company.myCompany.bankAccounts.detail.identityDoc'),
                      details.identityDocType
                        ? `${details.identityDocType}-${details.identityDocNumber}`
                        : null
                    )}
                    {renderDetailRow(
                      t('admin.company.myCompany.bankAccounts.wizard.phoneNumber'),
                      details.phoneNumber as string | undefined
                    )}
                  </>
                )}

                {/* International-specific details */}
                {account.accountCategory === 'international' && (
                  <>
                    {renderDetailRow(
                      t('admin.company.myCompany.bankAccounts.wizard.swiftCode'),
                      details.swiftCode as string | undefined
                    )}
                    {renderDetailRow(
                      t('admin.company.myCompany.bankAccounts.wizard.iban'),
                      details.iban as string | undefined
                    )}
                    {renderDetailRow(
                      t('admin.company.myCompany.bankAccounts.wizard.routingNumber'),
                      details.routingNumber as string | undefined
                    )}
                    {details.accountNumber && renderAccountNumberRow(String(details.accountNumber))}
                    {renderDetailRow(
                      t('admin.company.myCompany.bankAccounts.wizard.zelleEmail'),
                      details.zelleEmail as string | undefined
                    )}
                    {renderDetailRow(
                      t('admin.company.myCompany.bankAccounts.wizard.zellePhone'),
                      details.zellePhone as string | undefined
                    )}
                    {renderDetailRow(
                      t('admin.company.myCompany.bankAccounts.wizard.paypalEmail'),
                      details.paypalEmail as string | undefined
                    )}
                    {renderDetailRow(
                      t('admin.company.myCompany.bankAccounts.wizard.wiseEmail'),
                      details.wiseEmail as string | undefined
                    )}
                    {renderDetailRow(
                      t('admin.company.myCompany.bankAccounts.wizard.walletAddress'),
                      details.walletAddress as string | undefined
                    )}
                    {renderDetailRow(
                      t('admin.company.myCompany.bankAccounts.wizard.cryptoNetwork'),
                      details.cryptoNetwork as string | undefined
                    )}
                    {renderDetailRow(
                      t('admin.company.myCompany.bankAccounts.wizard.cryptoCurrency'),
                      details.cryptoCurrency as string | undefined
                    )}
                  </>
                )}
              </div>

            </div>

            {/* Payment Methods */}
            <div>
              <Typography variant="body1" className="font-semibold mb-2">
                {t('admin.company.myCompany.bankAccounts.detail.paymentMethods')}
              </Typography>
              <div className="flex flex-wrap gap-2">
                {account.acceptedPaymentMethods.map(m => (
                  <Chip key={m} variant="flat" size="sm">
                    {PAYMENT_METHOD_LABELS[m]?.es ?? m}
                  </Chip>
                ))}
              </div>
            </div>

            {/* Condominiums */}
            <div>
              <Typography variant="body1" className="font-semibold mb-2">
                {t('admin.company.myCompany.bankAccounts.detail.condominiums')}
              </Typography>
              {account.appliesToAllCondominiums ? (
                <Chip color="success" variant="flat">
                  {t('admin.company.myCompany.bankAccounts.allCondominiumsBadge')}
                </Chip>
              ) : (
                <p className="text-sm text-default-600">
                  {(account as TBankAccount & { condominiumIds?: string[] }).condominiumIds
                    ?.length ?? 0}{' '}
                  condominium(s)
                </p>
              )}
            </div>

            {/* Audit */}
            <div>
              <Typography variant="body1" className="font-semibold mb-2">
                {t('admin.company.myCompany.bankAccounts.detail.audit')}
              </Typography>
              <div className="rounded-lg bg-default-50 p-4">
                {renderDetailRow(
                  t('admin.company.myCompany.bankAccounts.detail.createdBy'),
                  formatUserName(account.creator)
                )}
                {renderDetailRow(
                  t('admin.company.myCompany.bankAccounts.detail.createdAt'),
                  formatDate(account.createdAt)
                )}
                {account.deactivatedAt && (
                  <>
                    {renderDetailRow(
                      t('admin.company.myCompany.bankAccounts.detail.deactivatedBy'),
                      formatUserName(account.deactivator)
                    )}
                    {renderDetailRow(
                      t('admin.company.myCompany.bankAccounts.detail.deactivatedAt'),
                      formatDate(account.deactivatedAt)
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Notes */}
            {account.notes && (
              <div>
                <Typography variant="body2" className="font-medium text-default-500">
                  {t('admin.company.myCompany.bankAccounts.wizard.notes')}
                </Typography>
                <p className="text-sm mt-1">{account.notes}</p>
              </div>
            )}
          </div>
        </ModalBody>

        <ModalFooter>
          {showDeactivateConfirm ? (
            <div className="flex flex-col w-full gap-3">
              <div className="p-3 bg-danger-50 border border-danger-200 rounded-lg">
                <Typography variant="body2" color="danger" className="font-medium">
                  {t('admin.company.myCompany.bankAccounts.detail.deactivateConfirm')}
                </Typography>
                <Typography variant="body2" color="muted" className="mt-1">
                  {t('admin.company.myCompany.bankAccounts.detail.deactivateWarning')}
                </Typography>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="flat"
                  onPress={() => setShowDeactivateConfirm(false)}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  color="danger"
                  isLoading={isDeactivating}
                  onPress={handleDeactivate}
                >
                  {isDeactivating
                    ? t('admin.company.myCompany.bankAccounts.detail.deactivating')
                    : t('admin.company.myCompany.bankAccounts.detail.deactivate')}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {isAdmin && account.isActive && (
                <Button
                  color="danger"
                  variant="flat"
                  onPress={() => setShowDeactivateConfirm(true)}
                >
                  {t('admin.company.myCompany.bankAccounts.detail.deactivate')}
                </Button>
              )}
              <Button variant="flat" onPress={onClose}>
                {t('common.close')}
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>

      {/* Password verification modal */}
      <Modal
        isOpen={showPasswordPrompt}
        onClose={() => { setShowPasswordPrompt(false); setPassword('') }}
        size="sm"
      >
        <ModalContent>
          <ModalHeader>
            <Typography variant="body1" className="font-semibold">
              {t('admin.company.myCompany.bankAccounts.detail.passwordRequired')}
            </Typography>
          </ModalHeader>
          <ModalBody>
            <Input
              type="password"
              label={t('admin.company.myCompany.bankAccounts.detail.enterPassword')}
              value={password}
              onValueChange={setPassword}
              onKeyDown={e => {
                if (e.key === 'Enter' && password) handlePasswordVerify()
              }}
            />
          </ModalBody>
          <ModalFooter>
            <Button
              variant="flat"
              onPress={() => { setShowPasswordPrompt(false); setPassword('') }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              color="success"
              isLoading={isVerifying}
              isDisabled={!password}
              onPress={handlePasswordVerify}
            >
              {t('admin.company.myCompany.bankAccounts.detail.verify')}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
