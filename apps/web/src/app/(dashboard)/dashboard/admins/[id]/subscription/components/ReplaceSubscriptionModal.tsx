'use client'

import { useState, useCallback } from 'react'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { Typography } from '@/ui/components/typography'
import { Card, CardBody } from '@/ui/components/card'
import { Chip } from '@/ui/components/chip'
import { AlertTriangle, Lock, Eye, EyeOff, Calendar, DollarSign, RefreshCw } from 'lucide-react'
import { useToast } from '@/ui/components/toast'
import { useTranslation } from '@/contexts'
import { useAuth } from '@/contexts/AuthContext'
import type { TManagementCompanySubscription } from '@packages/domain'

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
    const d = typeof date === 'string' ? new Date(date) : date
    return d.toLocaleDateString('es-VE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '-'
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getBillingCycleLabel = (cycle: string) => {
    return t(`superadmin.companies.subscription.form.billingCycles.${cycle}`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success'
      case 'trial':
        return 'primary'
      default:
        return 'default'
    }
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
    setShowPassword((prev) => !prev)
  }, [])

  const isLoading = isVerifying || isProcessing

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <RefreshCw className="text-warning" size={20} />
          {t('superadmin.companies.subscription.replace.title')}
        </ModalHeader>
        <ModalBody className="space-y-4">
          {/* Warning message */}
          <div className="rounded-lg bg-warning-50 p-4">
            <Typography variant="body2" color="warning">
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
                <Chip color={getStatusColor(currentSubscription.status)} size="sm" variant="flat">
                  {t(`superadmin.companies.subscription.form.statuses.${currentSubscription.status}`)}
                </Chip>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Typography variant="caption" color="muted">
                    {t('superadmin.companies.subscription.form.fields.subscriptionName')}
                  </Typography>
                  <Typography variant="body2" className="font-medium">
                    {currentSubscription.subscriptionName || t('superadmin.companies.subscription.defaultName')}
                  </Typography>
                </div>

                <div className="space-y-1">
                  <Typography variant="caption" color="muted">
                    {t('superadmin.companies.subscription.form.fields.billingCycle')}
                  </Typography>
                  <Typography variant="body2">
                    {getBillingCycleLabel(currentSubscription.billingCycle)}
                  </Typography>
                </div>

                <div className="space-y-1">
                  <Typography variant="caption" color="muted">
                    {t('superadmin.companies.subscription.form.fields.startDate')}
                  </Typography>
                  <div className="flex items-center gap-1">
                    <Calendar size={14} className="text-default-400" />
                    <Typography variant="body2">{formatDate(currentSubscription.startDate)}</Typography>
                  </div>
                </div>

                {currentSubscription.endDate && (
                  <div className="space-y-1">
                    <Typography variant="caption" color="muted">
                      {t('superadmin.companies.subscription.form.fields.endDate')}
                    </Typography>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} className="text-default-400" />
                      <Typography variant="body2">{formatDate(currentSubscription.endDate)}</Typography>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <Typography variant="caption" color="muted">
                    {t('superadmin.companies.subscription.form.fields.basePrice')}
                  </Typography>
                  <div className="flex items-center gap-1">
                    <DollarSign size={14} className="text-success" />
                    <Typography variant="body2" className="font-semibold">
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
              <AlertTriangle size={16} className="mt-0.5 text-warning" />
              <Typography variant="caption" color="muted">
                {t('superadmin.companies.subscription.replace.emailNotice')}
              </Typography>
            </div>
          </div>

          {/* Password verification */}
          <div className="space-y-2">
            <Typography variant="subtitle2" className="flex items-center gap-2">
              <Lock size={16} className="text-danger" />
              {t('superadmin.companies.subscription.cancel.passwordTitle')}
            </Typography>
            <Typography variant="caption" color="muted">
              {t('superadmin.companies.subscription.replace.passwordDescription')}
            </Typography>
            <Input
              type={showPassword ? 'text' : 'password'}
              label={t('superadmin.companies.subscription.cancel.passwordLabel')}
              placeholder={t('superadmin.companies.subscription.cancel.passwordPlaceholder')}
              value={password}
              onValueChange={(value) => {
                setPassword(value)
                setPasswordError(null)
              }}
              isInvalid={!!passwordError}
              errorMessage={passwordError ?? undefined}
              endContent={
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff size={18} className="text-default-400" />
                  ) : (
                    <Eye size={18} className="text-default-400" />
                  )}
                </button>
              }
            />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={handleClose} isDisabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button
            color="warning"
            onPress={handleConfirm}
            isLoading={isLoading}
            isDisabled={!password.trim()}
          >
            {isVerifying
              ? t('superadmin.companies.subscription.cancel.verifying')
              : t('superadmin.companies.subscription.replace.confirmButton')
            }
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
