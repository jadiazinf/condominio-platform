import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
  type QueryKey,
} from "@tanstack/react-query";
import { getHttpClient } from "../client/http-client.js";
import type { RequestConfig, ApiResponse } from "../types/http.js";
import { HttpError } from "../types/http.js";

type QueryFnData<T> = T;
type QueryError = HttpError;

export interface UseApiQueryOptions<T>
  extends Omit<
    UseQueryOptions<QueryFnData<T>, QueryError, T, QueryKey>,
    "queryKey" | "queryFn"
  > {
  path: string;
  queryKey: QueryKey;
  config?: RequestConfig;
}

export function useApiQuery<T>({
  path,
  queryKey,
  config,
  ...options
}: UseApiQueryOptions<T>) {
  const client = getHttpClient();

  return useQuery<T, QueryError>({
    queryKey,
    queryFn: async () => {
      const response = await client.get<T>(path, config);
      return response.data;
    },
    ...options,
  });
}

export interface UseApiMutationOptions<TData, TVariables>
  extends Omit<
    UseMutationOptions<ApiResponse<TData>, QueryError, TVariables>,
    "mutationFn"
  > {
  path: string | ((variables: TVariables) => string);
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  config?: RequestConfig;
  invalidateKeys?: QueryKey[];
}

export function useApiMutation<TData, TVariables = unknown>({
  path,
  method = "POST",
  config,
  invalidateKeys,
  ...options
}: UseApiMutationOptions<TData, TVariables>) {
  const client = getHttpClient();
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<TData>, QueryError, TVariables>({
    ...options,
    mutationFn: async (variables) => {
      const resolvedPath = typeof path === "function" ? path(variables) : path;

      switch (method) {
        case "POST":
          return client.post<TData>(resolvedPath, variables, config);
        case "PUT":
          return client.put<TData>(resolvedPath, variables, config);
        case "PATCH":
          return client.patch<TData>(resolvedPath, variables, config);
        case "DELETE":
          return client.delete<TData>(resolvedPath, config);
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    },
    onSuccess: async (...args) => {
      if (invalidateKeys) {
        await Promise.all(
          invalidateKeys.map((key) => queryClient.invalidateQueries({ queryKey: key }))
        );
      }
      return options.onSuccess?.(...args);
    },
  });
}
