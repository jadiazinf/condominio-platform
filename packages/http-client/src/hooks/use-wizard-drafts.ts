import type { TWizardDraft } from '@packages/domain'
import { useQuery } from '@tanstack/react-query'
import { useApiMutation } from './use-api-query'
import { getHttpClient } from '../client/http-client'
import { HttpError } from '../types/http'
import type { TApiDataResponse } from '../types/api-responses'

export const wizardDraftKeys = {
  all: ['wizard-drafts'] as const,
  detail: (wizardType: string, entityId: string) =>
    [...wizardDraftKeys.all, wizardType, entityId] as const,
}

export interface IUseWizardDraftOptions {
  enabled?: boolean
}

export function useWizardDraft(
  wizardType: string,
  entityId: string,
  options?: IUseWizardDraftOptions
) {
  const client = getHttpClient()

  return useQuery<TApiDataResponse<TWizardDraft> | null, HttpError>({
    queryKey: wizardDraftKeys.detail(wizardType, entityId),
    queryFn: async () => {
      try {
        const response = await client.get<TApiDataResponse<TWizardDraft>>(
          `/wizard-drafts/${wizardType}/${entityId}`
        )
        return response.data
      } catch (error) {
        // 404 means no draft exists — return null instead of throwing
        if (HttpError.isHttpError(error) && error.status === 404) {
          return null
        }
        throw error
      }
    },
    enabled: options?.enabled !== false && !!entityId,
    retry: false,
  })
}

export interface ISaveWizardDraftVariables {
  data: Record<string, unknown>
  currentStep: number
}

export interface ISaveWizardDraftOptions {
  onSuccess?: () => void
  onError?: (error: unknown) => void
}

export function useSaveWizardDraft(
  wizardType: string,
  entityId: string,
  options?: ISaveWizardDraftOptions
) {
  return useApiMutation<TApiDataResponse<TWizardDraft>, ISaveWizardDraftVariables>({
    path: `/wizard-drafts/${wizardType}/${entityId}`,
    method: 'PUT',
    config: {},
    invalidateKeys: [wizardDraftKeys.detail(wizardType, entityId)],
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  })
}

export interface IDeleteWizardDraftOptions {
  onSuccess?: () => void
  onError?: (error: unknown) => void
}

export function useDeleteWizardDraft(
  wizardType: string,
  entityId: string,
  options?: IDeleteWizardDraftOptions
) {
  return useApiMutation<void, void>({
    path: `/wizard-drafts/${wizardType}/${entityId}`,
    method: 'DELETE',
    config: {},
    invalidateKeys: [wizardDraftKeys.detail(wizardType, entityId)],
    onSuccess: options?.onSuccess,
    onError: options?.onError,
  })
}
