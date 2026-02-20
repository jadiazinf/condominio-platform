'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, ClipboardCheck, Clock, CheckCircle, XCircle, AlertCircle, Settings } from 'lucide-react'
import type { TAccessRequest } from '@packages/domain'

import { Typography } from '@/ui/components/typography'
import { Card, CardBody, CardHeader } from '@/ui/components/card'
import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { Chip } from '@/ui/components/chip'
import { Link } from '@/ui/components/link'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@/ui/components/modal'
import { useToast } from '@/ui/components/toast'
import { useUser } from '@/contexts'
import {
  useValidateAccessCode,
  type TValidateAccessCodeResponse,
} from '@packages/http-client/hooks'

import {
  JoinCondominiumModal,
  type IJoinCondominiumModalTranslations,
} from './JoinCondominiumModal'

interface INewUserDashboardClientProps {
  displayName: string
  initialRequests: TAccessRequest[]
  translations: {
    welcome: string
    subtitle: string
    joinTitle: string
    joinDescription: string
    codePlaceholder: string
    validate: string
    validating: string
    invalidCode: string
    profileIncomplete: {
      title: string
      message: string
      goToSettings: string
      close: string
    }
    pendingRequests: string
    noPendingRequests: string
    viewAllRequests: string
    status: {
      pending: string
      approved: string
      rejected: string
    }
    modal: IJoinCondominiumModalTranslations
  }
}

const STATUS_COLOR_MAP = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
} as const

const STATUS_ICON_MAP = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
} as const

export function NewUserDashboardClient({
  displayName,
  initialRequests,
  translations,
}: INewUserDashboardClientProps) {
  const router = useRouter()
  const toast = useToast()
  const { user } = useUser()
  const [code, setCode] = useState('')
  const [validationResult, setValidationResult] = useState<TValidateAccessCodeResponse | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const profileModal = useDisclosure()

  const validateMutation = useValidateAccessCode({
    onSuccess: (response) => {
      setValidationResult(response.data)
      setIsModalOpen(true)
    },
    onError: () => {
      toast.error(translations.invalidCode)
    },
  })

  const handleValidate = () => {
    if (code.length < 6) return

    const hasPhone = user?.phoneCountryCode && user?.phoneNumber
    const hasDocument = user?.idDocumentType && user?.idDocumentNumber
    if (!hasPhone || !hasDocument) {
      profileModal.onOpen()
      return
    }

    validateMutation.mutate({ code: code.toUpperCase() })
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setCode('')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <Typography variant="h2">{translations.welcome}</Typography>
        <Typography className="mt-1" color="muted" variant="body2">
          {translations.subtitle}
        </Typography>
      </div>

      {/* Join Condominium Card */}
      <Card className="border-success-200 bg-success-50/30">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <KeyRound size={20} className="text-success" />
            <span className="text-lg font-semibold">{translations.joinTitle}</span>
          </div>
        </CardHeader>
        <CardBody className="gap-4">
          <p className="text-sm text-default-600">{translations.joinDescription}</p>
          <div className="flex gap-2 max-w-md">
            <Input
              value={code}
              onValueChange={val => setCode(val.toUpperCase())}
              placeholder={translations.codePlaceholder}
              maxLength={8}
              className="font-mono text-lg tracking-widest"
              onKeyDown={e => e.key === 'Enter' && handleValidate()}
            />
            <Button
              color="success"
              onPress={handleValidate}
              isLoading={validateMutation.isPending}
              isDisabled={code.length < 6}
            >
              {validateMutation.isPending ? translations.validating : translations.validate}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* My Requests Section */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <ClipboardCheck size={18} className="text-default-500" />
              <span className="font-semibold">{translations.pendingRequests}</span>
            </div>
            {initialRequests.length > 0 && (
              <Link href="/dashboard/my-requests">
                <Button size="sm" variant="light">
                  {translations.viewAllRequests}
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardBody>
          {initialRequests.length === 0 ? (
            <p className="text-sm text-default-400 py-4 text-center">
              {translations.noPendingRequests}
            </p>
          ) : (
            <div className="space-y-3">
              {initialRequests.map(request => {
                const StatusIcon = STATUS_ICON_MAP[request.status as keyof typeof STATUS_ICON_MAP]
                return (
                  <div
                    key={request.id}
                    className="flex items-center justify-between rounded-lg border border-default-200 p-3"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium">
                        {request.condominium?.name ?? 'Condominium'}
                      </span>
                      <span className="text-xs text-default-400">
                        {request.building?.name} — {request.unit?.unitNumber}
                      </span>
                    </div>
                    <Chip
                      size="sm"
                      color={STATUS_COLOR_MAP[request.status as keyof typeof STATUS_COLOR_MAP]}
                      variant="flat"
                      startContent={StatusIcon ? <StatusIcon size={12} /> : undefined}
                    >
                      {translations.status[request.status as keyof typeof translations.status]}
                    </Chip>
                  </div>
                )
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {validationResult && (
        <JoinCondominiumModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          validationResult={validationResult}
          translations={translations.modal}
        />
      )}

      {/* Profile Incomplete Modal */}
      <Modal isOpen={profileModal.isOpen} onClose={profileModal.onClose} size="md">
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <AlertCircle size={20} className="text-warning" />
            <span>{translations.profileIncomplete.title}</span>
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600 whitespace-pre-line">
              {translations.profileIncomplete.message}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={profileModal.onClose}>
              {translations.profileIncomplete.close}
            </Button>
            <Link href="/dashboard/settings">
              <Button color="success" startContent={<Settings size={16} />}>
                {translations.profileIncomplete.goToSettings}
              </Button>
            </Link>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
