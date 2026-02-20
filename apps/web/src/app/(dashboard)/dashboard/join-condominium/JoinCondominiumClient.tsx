'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import type { TOwnershipType } from '@packages/domain'

import { Button } from '@/ui/components/button'
import { Input } from '@/ui/components/input'
import { Card, CardBody } from '@/ui/components/card'
import { useToast } from '@/ui/components/toast'
import {
  useValidateAccessCode,
  useSubmitAccessRequest,
  type TValidateAccessCodeResponse,
} from '@packages/http-client/hooks'

import { UnitSelectionForm } from './components/UnitSelectionForm'
import { SubmissionSuccess } from './components/SubmissionSuccess'

interface IJoinCondominiumClientProps {
  translations: {
    step1: {
      label: string
      placeholder: string
      validate: string
      validating: string
      invalidCode: string
    }
    step2: {
      condominiumInfo: string
      selectUnit: string
      ownershipType: string
      submit: string
      submitting: string
      back: string
    }
    step3: {
      title: string
      message: string
      viewRequests: string
      submitAnother: string
    }
    ownershipTypes: {
      owner: string
      tenant: string
      family_member: string
      authorized: string
    }
    errors: {
      submitFailed: string
    }
  }
}

export function JoinCondominiumClient({ translations }: IJoinCondominiumClientProps) {
  const toast = useToast()
  const router = useRouter()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [code, setCode] = useState('')
  const [validationResult, setValidationResult] = useState<TValidateAccessCodeResponse | null>(null)

  const validateMutation = useValidateAccessCode({
    onSuccess: (response) => {
      setValidationResult(response.data)
      setStep(2)
    },
    onError: () => {
      toast.error(translations.step1.invalidCode)
    },
  })

  const submitMutation = useSubmitAccessRequest({
    onSuccess: () => {
      setStep(3)
    },
    onError: () => {
      toast.error(translations.errors.submitFailed)
    },
  })

  const handleValidate = () => {
    if (code.length < 6) return
    validateMutation.mutate({ code: code.toUpperCase() })
  }

  const handleReset = () => {
    setStep(1)
    setCode('')
    setValidationResult(null)
  }

  // Step 1: Enter code
  if (step === 1) {
    return (
      <Card className="max-w-lg">
        <CardBody className="gap-4">
          <p className="text-sm font-medium">{translations.step1.label}</p>
          <div className="flex gap-2">
            <Input
              value={code}
              onValueChange={(val) => setCode(val.toUpperCase())}
              placeholder={translations.step1.placeholder}
              maxLength={8}
              className="font-mono text-lg tracking-widest"
              onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
            />
            <Button
              color="primary"
              onPress={handleValidate}
              isLoading={validateMutation.isPending}
              isDisabled={code.length < 6}
            >
              {validateMutation.isPending
                ? translations.step1.validating
                : translations.step1.validate}
            </Button>
          </div>
        </CardBody>
      </Card>
    )
  }

  // Step 2: Select unit
  if (step === 2 && validationResult) {
    return (
      <div className="max-w-2xl">
        <UnitSelectionForm
          validationResult={validationResult}
          translations={{
            condominiumInfo: translations.step2.condominiumInfo,
            selectUnit: translations.step2.selectUnit,
            ownershipType: translations.step2.ownershipType,
            submit: translations.step2.submit,
            submitting: translations.step2.submitting,
            ownershipTypes: translations.ownershipTypes,
          }}
          isSubmitting={submitMutation.isPending}
          onSubmit={(unitId: string, ownershipType: TOwnershipType) => {
            submitMutation.mutate({
              accessCodeId: validationResult.accessCodeId,
              unitId,
              ownershipType,
            })
          }}
          renderExtraActions={() => (
            <Button
              variant="flat"
              startContent={<ArrowLeft size={14} />}
              onPress={() => setStep(1)}
            >
              {translations.step2.back}
            </Button>
          )}
        />
      </div>
    )
  }

  // Step 3: Confirmation
  return (
    <SubmissionSuccess
      translations={translations.step3}
      onSubmitAnother={handleReset}
      onViewRequests={() => router.push('/dashboard/my-requests')}
    />
  )
}
