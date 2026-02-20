'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { TOwnershipType } from '@packages/domain'
import type { TValidateAccessCodeResponse } from '@packages/http-client/hooks'
import { useSubmitAccessRequest } from '@packages/http-client/hooks'
import { HttpError } from '@packages/http-client'

import { Modal, ModalContent, ModalHeader, ModalBody } from '@/ui/components/modal'
import { useToast } from '@/ui/components/toast'

import {
  UnitSelectionForm,
  type IUnitSelectionFormTranslations,
} from '../join-condominium/components/UnitSelectionForm'
import {
  SubmissionSuccess,
  type ISubmissionSuccessTranslations,
} from '../join-condominium/components/SubmissionSuccess'

export interface IJoinCondominiumModalTranslations {
  modalTitle: string
  unitSelection: IUnitSelectionFormTranslations
  success: ISubmissionSuccessTranslations
  errors: {
    submitFailed: string
    alreadyHasOwnership: string
    alreadyHasPendingRequest: string
    accessCodeInactive: string
    accessCodeExpired: string
    unitNotInCondominium: string
  }
}

const API_ERROR_MAP: Record<string, keyof IJoinCondominiumModalTranslations['errors']> = {
  'You already have an active ownership for this unit': 'alreadyHasOwnership',
  'You already have a pending request for this unit': 'alreadyHasPendingRequest',
  'Access code is inactive': 'accessCodeInactive',
  'Access code has expired': 'accessCodeExpired',
  'Unit does not belong to this condominium': 'unitNotInCondominium',
}

interface IJoinCondominiumModalProps {
  isOpen: boolean
  onClose: () => void
  validationResult: TValidateAccessCodeResponse
  translations: IJoinCondominiumModalTranslations
}

export function JoinCondominiumModal({
  isOpen,
  onClose,
  validationResult,
  translations,
}: IJoinCondominiumModalProps) {
  const toast = useToast()
  const router = useRouter()
  const [step, setStep] = useState<'select' | 'success'>('select')

  // Reset step when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('select')
    }
  }, [isOpen])

  const getSubmitErrorMessage = (error: Error): string => {
    if (HttpError.isHttpError(error)) {
      const translationKey = API_ERROR_MAP[error.message]
      if (translationKey) {
        return translations.errors[translationKey]
      }
    }
    return translations.errors.submitFailed
  }

  const submitMutation = useSubmitAccessRequest({
    onSuccess: () => {
      setStep('success')
    },
    onError: (error) => {
      toast.error(getSubmitErrorMessage(error))
    },
  })

  const handleSubmit = (unitId: string, ownershipType: TOwnershipType) => {
    submitMutation.mutate({
      accessCodeId: validationResult.accessCodeId,
      unitId,
      ownershipType,
    })
  }

  const handleSubmitAnother = () => {
    onClose()
    router.refresh()
  }

  const handleViewRequests = () => {
    onClose()
    router.push('/dashboard/my-requests')
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      scrollBehavior="inside"
      isDismissable={!submitMutation.isPending}
      isKeyboardDismissDisabled={submitMutation.isPending}
    >
      <ModalContent>
        <ModalHeader>
          <span className="text-lg font-semibold">{translations.modalTitle}</span>
        </ModalHeader>
        <ModalBody className="pb-6">
          {step === 'select' ? (
            <UnitSelectionForm
              validationResult={validationResult}
              translations={translations.unitSelection}
              isSubmitting={submitMutation.isPending}
              onSubmit={handleSubmit}
            />
          ) : (
            <SubmissionSuccess
              translations={translations.success}
              onSubmitAnother={handleSubmitAnother}
              onViewRequests={handleViewRequests}
            />
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}
