import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
  type QueryKey,
} from '@tanstack/react-query'
import { getHttpClient } from '../client/http-client'
import type { RequestConfig, ApiResponse } from '../types/http'
import { HttpError } from '../types/http'

type QueryFnData<T> = T
type QueryError = HttpError

export interface UseApiQueryOptions<T> extends Omit<
  UseQueryOptions<QueryFnData<T>, QueryError, T, QueryKey>,
  'queryKey' | 'queryFn'
> {
  path: string
  queryKey: QueryKey
  config?: RequestConfig
}

export function useApiQuery<T>({ path, queryKey, config, ...options }: UseApiQueryOptions<T>) {
  const client = getHttpClient()

  return useQuery<T, QueryError>({
    queryKey,
    queryFn: async () => {
      const response = await client.get<T>(path, config)
      return response.data
    },
    ...options,
  })
}

export interface UseApiMutationOptions<TData, TVariables, TContext = unknown> extends Omit<
  UseMutationOptions<ApiResponse<TData>, QueryError, TVariables, TContext>,
  'mutationFn'
> {
  path: string | ((variables: TVariables) => string)
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  config?: RequestConfig
  invalidateKeys?: QueryKey[] | ((variables: TVariables) => QueryKey[])
}

export function useApiMutation<TData, TVariables = unknown, TContext = unknown>({
  path,
  method = 'POST',
  config,
  invalidateKeys,
  ...options
}: UseApiMutationOptions<TData, TVariables, TContext>) {
  const client = getHttpClient()
  const queryClient = useQueryClient()

  return useMutation<ApiResponse<TData>, QueryError, TVariables, TContext>({
    ...options,
    mutationFn: async variables => {
      const resolvedPath = typeof path === 'function' ? path(variables) : path

      switch (method) {
        case 'POST':
          return client.post<TData>(resolvedPath, variables, config)
        case 'PUT':
          return client.put<TData>(resolvedPath, variables, config)
        case 'PATCH':
          return client.patch<TData>(resolvedPath, variables, config)
        case 'DELETE':
          return client.delete<TData>(resolvedPath, variables, config)
        default:
          throw new Error(`Unsupported method: ${method}`)
      }
    },
    onSuccess: async (data, variables, context, ...rest) => {
      if (invalidateKeys) {
        const keys = typeof invalidateKeys === 'function' ? invalidateKeys(variables) : invalidateKeys
        await Promise.all(
          keys.map(key => queryClient.invalidateQueries({ queryKey: key }))
        )
      }
      return options.onSuccess?.(data, variables, context, ...rest)
    },
  })
}
