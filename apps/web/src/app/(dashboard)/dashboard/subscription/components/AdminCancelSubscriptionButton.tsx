'use client'

import { useState } from 'react'
import { AlertTriangle, Eye, EyeOff } from 'lucide-react'

import { Button } from '@/ui/components/button'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@/ui/components/modal'
import { Input } from '@/ui/components/input'
import { Textarea } from '@/ui/components/textarea'
import { Typography } from '@/ui/components/typography'
import { useTranslation, useAuth } from '@/contexts'
import { useToast } from '@/ui/components/toast'
import { cancelMyCompanySubscription } from '@packages/http-client'
import { useRouter } from 'next/navigation'

interface AdminCancelSubscriptionButtonProps {
  companyId: string
  subscriptionName: string | null
}

export function AdminCancelSubscriptionButton({
  companyId,
  subscriptionName,
}: AdminCancelSubscriptionButtonProps) {
  const { t } = useTranslation()
  const { user, verifyPassword } = useAuth()
  const toaster = useToast()
  const router = useRouter()
  const { isOpen, onOpen, onClose } = useDisclosure()
  const tp = 'admin.subscription'

  const [reason, setReason] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const handleClose = () => {
    setReason('')
    setPassword('')
    setShowPassword(false)
    setPasswordError('')
    onClose()
  }

  const handleConfirm = async () => {
    if (!password) {
      setPasswordError(t(`${tp}.cancel.passwordRequired`))
      return
    }

    setIsVerifying(true)
    setPasswordError('')

    try {
      const isValid = await verifyPassword(password)
      if (!isValid) {
        setPasswordError(t(`${tp}.cancel.passwordInvalid`))
        setIsVerifying(false)
        return
      }

      const token = await user?.getIdToken()
      if (!token) throw new Error('No token')

      await cancelMyCompanySubscription(token, companyId, {
        cancellationReason: reason || undefined,
      })

      toaster.success(t(`${tp}.cancel.success`))

      handleClose()
      router.refresh()
    } catch {
      toaster.error(t(`${tp}.cancel.error`))
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <>
      <Button
        color="danger"
        variant="flat"
        size="sm"
        onPress={onOpen}
      >
        {t(`${tp}.cancel.button`)}
      </Button>

      <Modal isOpen={isOpen} onClose={handleClose} size="md">
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <AlertTriangle className="text-danger" size={20} />
            {t(`${tp}.cancel.title`)}
          </ModalHeader>
          <ModalBody className="space-y-4">
            <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
              {t(`${tp}.cancel.warning`, { name: subscriptionName || 'Plan' })}
            </div>

            <Textarea
              label={t(`${tp}.cancel.reasonLabel`)}
              placeholder={t(`${tp}.cancel.reasonPlaceholder`)}
              value={reason}
              onValueChange={setReason}
            />

            <div className="rounded-lg bg-warning-50 p-3 text-sm text-warning-700">
              {t(`${tp}.cancel.passwordPrompt`)}
            </div>

            <Input
              label={t(`${tp}.cancel.passwordLabel`)}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onValueChange={(val) => {
                setPassword(val)
                setPasswordError('')
              }}
              isInvalid={!!passwordError}
              errorMessage={passwordError}
              endContent={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-default-400 hover:text-default-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={handleClose}>
              {t(`${tp}.cancel.back`)}
            </Button>
            <Button
              color="danger"
              onPress={handleConfirm}
              isLoading={isVerifying}
            >
              {t(`${tp}.cancel.confirm`)}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
