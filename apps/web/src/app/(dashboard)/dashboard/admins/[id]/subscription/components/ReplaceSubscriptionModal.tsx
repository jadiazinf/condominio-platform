'use client'

import type { TManagementCompanySubscription } from '@packages/domain'

import { useState, useCallback } from 'react'
import { AlertTriangle, Lock, Eye, EyeOff, Calendar, DollarSign, RefreshCw } from 'lucide-react'
import { formatCurrency } from '@packages/utils/currency'
import { formatFullDate } from '@packages/utils/dates'

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { Typography } from '@/ui/components/typography'
import { Card, CardBody } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { useToast } from '@/ui/components/toast'
import { useTranslation } from '@/contexts'
import { useAuth } from '@/contexts/AuthContext'
import { getSubscriptionStatusColor } from '@/utils/status-colors'

interface ReplaceSubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  currentSubscription: TManagementCompanySubscription
  isProcessing: boolean
}

export function ReplaceSubscriptionModal({
  isOpen,
  onClose,
  onConfirm,
  currentSubscription,
  isProcessing,
}: ReplaceSubscriptionModalProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const { verifyPassword } = useAuth()

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-'

    return formatFullDate(date)
  }

  const getBillingCycleLabel = (cycle: string) => {
    return t(`superadmin.companies.subscription.form.billingCycles.${cycle}`)
  }

  const handleConfirm = useCallback(async () => {
    // Reset password error
    setPasswordError(null)

    // Validate password is entered
    if (!password.trim()) {
      setPasswordError(t('superadmin.companies.subscription.cancel.passwordRequired'))

      return
    }

    // Verify password using Firebase reauthentication
    setIsVerifying(true)
    try {
      const isValid = await verifyPassword(password)

      if (!isValid) {
        setPasswordError(t('superadmin.companies.subscription.cancel.passwordInvalid'))
        setIsVerifying(false)

        return
      }

      // Password verified, proceed with replacement
      onConfirm()
    } catch {
      setPasswordError(t('superadmin.companies.subscription.cancel.passwordError'))
    } finally {
      setIsVerifying(false)
    }
  }, [password, verifyPassword, t, onConfirm])

  const handleClose = useCallback(() => {
    setPassword('')
    setPasswordError(null)
    setShowPassword(false)
    onClose()
  }, [onClose])

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev)
  }, [])

  const isLoading = isVerifying || isProcessing

  return (
    <Modal isOpen={isOpen} size="lg" onClose={handleClose}>
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <RefreshCw className="text-warning" size={20} />
          {t('superadmin.companies.subscription.replace.title')}
        </ModalHeader>
        <ModalBody className="space-y-4">
          {/* Warning message */}
          <div className="rounded-lg bg-warning-50 p-4">
            <Typography color="warning" variant="body2">
              {t('superadmin.companies.subscription.replace.warning')}
            </Typography>
          </div>

          {/* Current subscription details */}
          <Card className="border border-default-200" shadow="none">
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between">
                <Typography variant="subtitle2">
                  {t('superadmin.companies.subscription.replace.currentSubscription')}
                </Typography>
                <Chip
                  color={getSubscriptionStatusColor(currentSubscription.status)}
                  size="sm"
                  variant="flat"
                >
                  {t(
                    `superadmin.companies.subscription.form.statuses.${currentSubscription.status}`
                  )}
                </Chip>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Typography color="muted" variant="caption">
                    {t('superadmin.companies.subscription.form.fields.subscriptionName')}
                  </Typography>
                  <Typography className="font-medium" variant="body2">
                    {currentSubscription.subscriptionName ||
                      t('superadmin.companies.subscription.defaultName')}
                  </Typography>
                </div>

                <div className="space-y-1">
                  <Typography color="muted" variant="caption">
                    {t('superadmin.companies.subscription.form.fields.billingCycle')}
                  </Typography>
                  <Typography variant="body2">
                    {getBillingCycleLabel(currentSubscription.billingCycle)}
                  </Typography>
                </div>

                <div className="space-y-1">
                  <Typography color="muted" variant="caption">
                    {t('superadmin.companies.subscription.form.fields.startDate')}
                  </Typography>
                  <div className="flex items-center gap-1">
                    <Calendar className="text-default-400" size={14} />
                    <Typography variant="body2">
                      {formatDate(currentSubscription.startDate)}
                    </Typography>
                  </div>
                </div>

                {currentSubscription.endDate && (
                  <div className="space-y-1">
                    <Typography color="muted" variant="caption">
                      {t('superadmin.companies.subscription.form.fields.endDate')}
                    </Typography>
                    <div className="flex items-center gap-1">
                      <Calendar className="text-default-400" size={14} />
                      <Typography variant="body2">
                        {formatDate(currentSubscription.endDate)}
                      </Typography>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <Typography color="muted" variant="caption">
                    {t('superadmin.companies.subscription.form.fields.basePrice')}
                  </Typography>
                  <div className="flex items-center gap-1">
                    <DollarSign className="text-success" size={14} />
                    <Typography className="font-semibold" variant="body2">
                      {formatCurrency(currentSubscription.basePrice)}
                    </Typography>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Email notification warning */}
          <div className="rounded-lg bg-default-50 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 text-warning" size={16} />
              <Typography color="muted" variant="caption">
                {t('superadmin.companies.subscription.replace.emailNotice')}
              </Typography>
            </div>
          </div>

          {/* Password verification */}
          <div className="space-y-2">
            <Typography className="flex items-center gap-2" variant="subtitle2">
              <Lock className="text-danger" size={16} />
              {t('superadmin.companies.subscription.cancel.passwordTitle')}
            </Typography>
            <Typography color="muted" variant="caption">
              {t('superadmin.companies.subscription.replace.passwordDescription')}
            </Typography>
            <Input
              endContent={
                <button
                  className="focus:outline-none"
                  type="button"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? (
                    <EyeOff className="text-default-400" size={18} />
                  ) : (
                    <Eye className="text-default-400" size={18} />
                  )}
                </button>
              }
              errorMessage={passwordError ?? undefined}
              isInvalid={!!passwordError}
              label={t('superadmin.companies.subscription.cancel.passwordLabel')}
              placeholder={t('superadmin.companies.subscription.cancel.passwordPlaceholder')}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onValueChange={value => {
                setPassword(value)
                setPasswordError(null)
              }}
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button isDisabled={isLoading} variant="flat" onPress={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button
            color="warning"
            isDisabled={!password.trim()}
            isLoading={isLoading}
            onPress={handleConfirm}
          >
            {isVerifying
              ? t('superadmin.companies.subscription.cancel.verifying')
              : t('superadmin.companies.subscription.replace.confirmButton')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
