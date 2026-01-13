export type {
  HttpMethod,
  RequestConfig,
  ApiResponse,
  ApiError,
} from "./http.js";

export { HttpError } from "./http.js";

// API Response Types
export type {
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
} from "./api-responses.js";

export {
  ApiErrorCodes,
  isApiDataResponse,
  isApiMessageResponse,
  isApiValidationError,
  isApiErrorResponse,
  isApiSimpleError,
} from "./api-responses.js";
