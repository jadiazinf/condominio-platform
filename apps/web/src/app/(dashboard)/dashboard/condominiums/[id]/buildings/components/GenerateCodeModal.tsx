'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { TCondominiumAccessCode, TAccessCodeValidity } from '@packages/domain'

import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/ui/components/modal'
import { Button } from '@/ui/components/button'
import { RadioGroup, Radio } from '@/ui/components/radio'
import { useToast } from '@/ui/components/toast'
import { useGenerateAccessCode } from '@packages/http-client/hooks'

interface IGenerateCodeModalProps {
  isOpen: boolean
  onClose: () => void
  condominiumId: string
  hasExistingCode: boolean
  translations: {
    title: string
    warning: string
    validity: string
    validityOptions: {
      '1_day': string
      '7_days': string
      '1_month': string
      '1_year': string
    }
    cancel: string
    generate: string
    generating: string
    success: string
    error: string
  }
  onGenerated: (code: TCondominiumAccessCode) => void
}

const VALIDITY_OPTIONS: TAccessCodeValidity[] = ['1_day', '7_days', '1_month', '1_year']

export function GenerateCodeModal({
  isOpen,
  onClose,
  condominiumId,
  hasExistingCode,
  translations,
  onGenerated,
}: IGenerateCodeModalProps) {
  const toast = useToast()
  const router = useRouter()
  const [validity, setValidity] = useState<TAccessCodeValidity>('7_days')

  const generateMutation = useGenerateAccessCode({
    condominiumId,
    onSuccess: response => {
      toast.success(translations.success)
      onGenerated(response.data)
      router.refresh()
      onClose()
    },
    onError: () => {
      toast.error(translations.error)
    },
  })

  const handleGenerate = () => {
    generateMutation.mutate({ validity })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalContent>
        <ModalHeader>{translations.title}</ModalHeader>
        <ModalBody>
          {hasExistingCode && (
            <div className="mb-4 rounded-lg bg-warning-50 border border-warning-200 p-3">
              <p className="text-sm text-warning-700">{translations.warning}</p>
            </div>
          )}

          <RadioGroup
            label={translations.validity}
            value={validity}
            onValueChange={val => setValidity(val as TAccessCodeValidity)}
            color="success"
          >
            {VALIDITY_OPTIONS.map(opt => (
              <Radio key={opt} value={opt} color="success">
                {translations.validityOptions[opt]}
              </Radio>
            ))}
          </RadioGroup>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            {translations.cancel}
          </Button>
          <Button color="success" onPress={handleGenerate} isLoading={generateMutation.isPending}>
            {generateMutation.isPending ? translations.generating : translations.generate}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
