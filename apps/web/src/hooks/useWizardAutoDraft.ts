'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useWizardDraft, useSaveWizardDraft, useDeleteWizardDraft } from '@packages/http-client'

interface IUseWizardAutoDraftOptions {
  wizardType: string
  entityId: string
  enabled?: boolean
  debounceMs?: number
}

interface IUseWizardAutoDraftReturn<T> {
  draft: { data: T; currentStep: number; updatedAt: Date } | null
  isLoadingDraft: boolean
  hasDraft: boolean
  saveDraft: (formData: T, step: number) => void
  clearDraft: () => void
}

export function useWizardAutoDraft<T>({
  wizardType,
  entityId,
  enabled = true,
  debounceMs = 1500,
}: IUseWizardAutoDraftOptions): IUseWizardAutoDraftReturn<T> {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingDataRef = useRef<{ formData: T; step: number } | null>(null)

  const { data: draftResponse, isLoading } = useWizardDraft(wizardType, entityId, {
    enabled,
  })

  const saveMutation = useSaveWizardDraft(wizardType, entityId)
  const deleteMutation = useDeleteWizardDraft(wizardType, entityId)

  // Use refs to stabilize mutation references and prevent effect re-triggers
  const saveMutationRef = useRef(saveMutation)

  saveMutationRef.current = saveMutation
  const deleteMutationRef = useRef(deleteMutation)

  deleteMutationRef.current = deleteMutation

  const saveDraft = useCallback(
    (formData: T, step: number) => {
      if (!enabled) return

      pendingDataRef.current = { formData, step }

      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      timerRef.current = setTimeout(() => {
        if (pendingDataRef.current) {
          const { formData: fd, step: s } = pendingDataRef.current

          pendingDataRef.current = null
          saveMutationRef.current.mutate({
            data: fd as Record<string, unknown>,
            currentStep: s,
          })
        }
        timerRef.current = null
      }, debounceMs)
    },
    [enabled, debounceMs]
  )

  const clearDraft = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    pendingDataRef.current = null
    deleteMutationRef.current.mutate()
  }, [])

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      if (pendingDataRef.current) {
        const { formData, step } = pendingDataRef.current

        pendingDataRef.current = null
        saveMutationRef.current.mutate({
          data: formData as Record<string, unknown>,
          currentStep: step,
        })
      }
    }
  }, [])

  // draftResponse is null when no draft exists (404), or has .data when a draft exists
  const draftData = draftResponse?.data ?? null
  const draft = draftData
    ? {
        data: draftData.data as T,
        currentStep: draftData.currentStep,
        updatedAt: draftData.updatedAt,
      }
    : null

  return {
    draft,
    isLoadingDraft: isLoading,
    hasDraft: !!draft,
    saveDraft,
    clearDraft,
  }
}
