'use client'

import { Check, X, Loader2, Building2, Home, MapPin } from 'lucide-react'
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/modal'
import { Button } from '@heroui/button'
import { Progress } from '@/ui/components/progress'

import { useTranslation } from '@/contexts'
import { Typography } from '@/ui/components/typography'
import type { TSubmissionState } from '../hooks/useCreateCondominiumWizard'

interface SubmissionProgressModalProps {
  state: TSubmissionState
  onNavigate: () => void
  onClose: () => void
}

function StepStatus({ done, active, error }: { done: boolean; active: boolean; error?: boolean }) {
  if (error) {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-danger-100">
        <X size={14} className="text-danger" />
      </div>
    )
  }
  if (done) {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success-100">
        <Check size={14} className="text-success" />
      </div>
    )
  }
  if (active) {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100">
        <Loader2 size={14} className="text-primary animate-spin" />
      </div>
    )
  }
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-default-100">
      <div className="h-2 w-2 rounded-full bg-default-300" />
    </div>
  )
}

export function SubmissionProgressModal({ state, onNavigate, onClose }: SubmissionProgressModalProps) {
  const { t } = useTranslation()
  const isOpen = state.status !== 'idle'
  const isComplete = state.status === 'success' || state.status === 'partial_error' || state.status === 'error'

  const { progress } = state
  const totalSteps =
    1 + progress.buildingsTotal + progress.unitsTotal
  const completedSteps =
    (progress.condominiumCreated ? 1 : 0) +
    progress.buildingsCreated +
    progress.unitsCreated
  const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0

  return (
    <Modal isOpen={isOpen} isDismissable={false} hideCloseButton={!isComplete} onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          {state.status === 'success'
            ? t('superadmin.condominiums.wizard.submission.complete')
            : state.status === 'error'
              ? t('superadmin.condominiums.form.error')
              : t('superadmin.condominiums.wizard.submission.creating')}
        </ModalHeader>
        <ModalBody>
          {/* Progress bar */}
          {state.status === 'submitting' && (
            <Progress
              aria-label="Submission progress"
              value={progressPercent}
              classNames={{ indicator: 'bg-primary' }}
              className="mb-4"
            />
          )}

          {/* Steps */}
          <div className="space-y-4">
            {/* Step 1: Condominium */}
            <div className="flex items-center gap-3">
              <StepStatus
                done={progress.condominiumCreated}
                active={state.status === 'submitting' && !progress.condominiumCreated}
                error={state.status === 'error' && !progress.condominiumCreated}
              />
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-default-500" />
                <Typography variant="body2">
                  {t('superadmin.condominiums.wizard.submission.creatingCondominium')}
                </Typography>
              </div>
            </div>

            {/* Step 2: Buildings */}
            <div className="flex items-center gap-3">
              <StepStatus
                done={progress.buildingsCreated === progress.buildingsTotal && progress.condominiumCreated}
                active={
                  state.status === 'submitting' &&
                  progress.condominiumCreated &&
                  progress.buildingsCreated < progress.buildingsTotal
                }
              />
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-default-500" />
                <Typography variant="body2">
                  {t('superadmin.condominiums.wizard.submission.creatingBuildings')}
                  {progress.buildingsTotal > 0 && (
                    <span className="text-default-400 ml-1">
                      ({progress.buildingsCreated}/{progress.buildingsTotal})
                    </span>
                  )}
                </Typography>
              </div>
            </div>

            {/* Step 3: Units */}
            <div className="flex items-center gap-3">
              <StepStatus
                done={progress.unitsCreated === progress.unitsTotal && progress.buildingsCreated === progress.buildingsTotal && progress.condominiumCreated}
                active={
                  state.status === 'submitting' &&
                  progress.buildingsCreated === progress.buildingsTotal &&
                  progress.unitsCreated < progress.unitsTotal
                }
              />
              <div className="flex items-center gap-2">
                <Home size={16} className="text-default-500" />
                <Typography variant="body2">
                  {t('superadmin.condominiums.wizard.submission.creatingUnits')}
                  {progress.unitsTotal > 0 && (
                    <span className="text-default-400 ml-1">
                      ({progress.unitsCreated}/{progress.unitsTotal})
                    </span>
                  )}
                </Typography>
              </div>
            </div>
          </div>

          {/* Errors */}
          {state.errors.length > 0 && (
            <div className="mt-4 rounded-lg bg-danger-50 p-3">
              <Typography variant="caption" className="text-danger font-medium mb-1 block">
                {t('superadmin.condominiums.wizard.submission.partialError')}:
              </Typography>
              <ul className="list-disc list-inside space-y-0.5">
                {state.errors.map((error, i) => (
                  <li key={i} className="text-xs text-danger-600">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          {isComplete && (
            <>
              {state.status !== 'error' && (
                <Button color="success" onPress={onNavigate}>
                  {t('superadmin.condominiums.wizard.submission.goToCondominium')}
                </Button>
              )}
              {state.status === 'error' && (
                <Button variant="bordered" onPress={onClose}>
                  {t('common.close')}
                </Button>
              )}
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
