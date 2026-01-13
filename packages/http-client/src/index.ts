// Config
export { getEnvConfig, setEnvConfig, resetEnvConfig } from "./config/index.js";
export type { EnvConfig } from "./config/index.js";

// Client
export {
  createHttpClient,
  getHttpClient,
  setHttpClient,
} from "./client/index.js";
export type { HttpClient, HttpClientConfig } from "./client/index.js";

// Hooks
export {
  createQueryClient,
  getQueryClient,
  setQueryClient,
  QueryProvider,
  useApiQuery,
  useApiMutation,
  useHealthCheck,
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
  useIsFetching,
  useIsMutating,
} from "./hooks/index.js";
export type {
  QueryProviderProps,
  UseApiQueryOptions,
  UseApiMutationOptions,
  HealthCheckResult,
  UseHealthCheckOptions,
} from "./hooks/index.js";

// Types
export type {
  HttpMethod,
  RequestConfig,
  ApiResponse,
  ApiError,
  // API Response Types
  TApiDataResponse,
  TApiMessageResponse,
  TApiDataMessageResponse,
  TValidationFieldError,
  TApiValidationErrorResponse,
  TApiErrorResponse,
  TApiSimpleErrorResponse,
  TApiErrorCode,
  TApiSuccessResponse,
  TApiErrorResponseUnion,
  TApiResponse,
  TApiListResponse,
  TApiEntityResponse,
  TApiCreatedResponse,
  TApiUpdatedResponse,
  TApiDeletedResponse,
} from "./types/index.js";

export {
  HttpError,
  // API Response utilities
  ApiErrorCodes,
  isApiDataResponse,
  isApiMessageResponse,
  isApiValidationError,
  isApiErrorResponse,
  isApiSimpleError,
} from "./types/index.js";
