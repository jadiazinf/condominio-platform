'use client'

import { useState, useCallback } from 'react'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { Textarea } from '@/ui/components/textarea'
import { Typography } from '@/ui/components/typography'
import { AlertTriangle, Lock, Eye, EyeOff } from 'lucide-react'
import { useToast } from '@/ui/components/toast'
import { useTranslation } from '@/contexts'
import { useAuth } from '@/contexts/AuthContext'
import {
  useCancelSubscription,
  managementCompanySubscriptionKeys,
  useQueryClient,
} from '@packages/http-client'

interface CancelSubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  companyId: string
  subscriptionName: string
  cancelledBy: string
}

export function CancelSubscriptionModal({
  isOpen,
  onClose,
  companyId,
  subscriptionName,
  cancelledBy,
}: CancelSubscriptionModalProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { verifyPassword } = useAuth()

  const [reason, setReason] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const { mutate: cancelSubscription, isPending } = useCancelSubscription(companyId, {
    onSuccess: () => {
      toast.success(t('superadmin.companies.subscription.cancelSuccess'))
      queryClient.invalidateQueries({ queryKey: managementCompanySubscriptionKeys.all })
      handleClose()
    },
    onError: (error) => {
      toast.error(error.message || t('superadmin.companies.subscription.cancelError'))
    },
  })

  const handleCancel = useCallback(async () => {
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

      // Password verified, proceed with cancellation
      cancelSubscription({
        cancelledBy,
        cancellationReason: reason || undefined,
      })
    } catch {
      setPasswordError(t('superadmin.companies.subscription.cancel.passwordError'))
    } finally {
      setIsVerifying(false)
    }
  }, [cancelSubscription, cancelledBy, reason, password, verifyPassword, t])

  const handleClose = useCallback(() => {
    setReason('')
    setPassword('')
    setPasswordError(null)
    setShowPassword(false)
    onClose()
  }, [onClose])

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev)
  }, [])

  const isProcessing = isVerifying || isPending

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <AlertTriangle className="text-danger" size={20} />
          {t('superadmin.companies.subscription.cancel.title')}
        </ModalHeader>
        <ModalBody className="space-y-4">
          <div className="rounded-lg bg-danger-50 p-4">
            <Typography variant="body2" color="danger">
              {t('superadmin.companies.subscription.cancel.warning', {
                name: subscriptionName || 'Plan Personalizado',
              })}
            </Typography>
          </div>

          <div className="rounded-lg bg-warning-50 p-4">
            <Typography variant="body2" color="warning">
              {t('superadmin.companies.subscription.cancel.emailNotice')}
            </Typography>
          </div>

          <Textarea
            label={t('superadmin.companies.subscription.cancel.reasonLabel')}
            placeholder={t('superadmin.companies.subscription.cancel.reasonPlaceholder')}
            value={reason}
            onValueChange={setReason}
            minRows={3}
          />

          <div className="space-y-2">
            <Typography variant="subtitle2" className="flex items-center gap-2">
              <Lock size={16} className="text-danger" />
              {t('superadmin.companies.subscription.cancel.passwordTitle')}
            </Typography>
            <Typography variant="caption" color="muted">
              {t('superadmin.companies.subscription.cancel.passwordDescription')}
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
          <Button variant="flat" onPress={handleClose} isDisabled={isProcessing}>
            {t('superadmin.companies.subscription.cancel.backButton')}
          </Button>
          <Button
            color="danger"
            onPress={handleCancel}
            isLoading={isProcessing}
            isDisabled={!password.trim()}
          >
            {isVerifying
              ? t('superadmin.companies.subscription.cancel.verifying')
              : t('superadmin.companies.subscription.cancel.confirmButton')
            }
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
