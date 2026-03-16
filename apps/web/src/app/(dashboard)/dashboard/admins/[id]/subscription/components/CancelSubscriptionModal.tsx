'use client'

import { useState, useCallback } from 'react'
import { AlertTriangle, Lock, Eye, EyeOff } from 'lucide-react'
import {
  useCancelSubscription,
  managementCompanySubscriptionKeys,
  useQueryClient,
} from '@packages/http-client'

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { Textarea } from '@/ui/components/textarea'
import { Typography } from '@/ui/components/typography'
import { useToast } from '@/ui/components/toast'
import { useTranslation } from '@/contexts'
import { useAuth } from '@/contexts/AuthContext'

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
    onError: error => {
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
    setShowPassword(prev => !prev)
  }, [])

  const isProcessing = isVerifying || isPending

  return (
    <Modal isOpen={isOpen} size="md" onClose={handleClose}>
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <AlertTriangle className="text-danger" size={20} />
          {t('superadmin.companies.subscription.cancel.title')}
        </ModalHeader>
        <ModalBody className="space-y-4">
          <div className="rounded-lg bg-danger-50 p-4">
            <Typography color="danger" variant="body2">
              {t('superadmin.companies.subscription.cancel.warning', {
                name: subscriptionName || 'Plan Personalizado',
              })}
            </Typography>
          </div>

          <div className="rounded-lg bg-warning-50 p-4">
            <Typography color="warning" variant="body2">
              {t('superadmin.companies.subscription.cancel.emailNotice')}
            </Typography>
          </div>

          <Textarea
            label={t('superadmin.companies.subscription.cancel.reasonLabel')}
            minRows={3}
            placeholder={t('superadmin.companies.subscription.cancel.reasonPlaceholder')}
            value={reason}
            onValueChange={setReason}
          />

          <div className="space-y-2">
            <Typography className="flex items-center gap-2" variant="subtitle2">
              <Lock className="text-danger" size={16} />
              {t('superadmin.companies.subscription.cancel.passwordTitle')}
            </Typography>
            <Typography color="muted" variant="caption">
              {t('superadmin.companies.subscription.cancel.passwordDescription')}
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
          <Button isDisabled={isProcessing} variant="flat" onPress={handleClose}>
            {t('superadmin.companies.subscription.cancel.backButton')}
          </Button>
          <Button
            color="danger"
            isDisabled={!password.trim()}
            isLoading={isProcessing}
            onPress={handleCancel}
          >
            {isVerifying
              ? t('superadmin.companies.subscription.cancel.verifying')
              : t('superadmin.companies.subscription.cancel.confirmButton')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
