import { useQuery } from "@tanstack/react-query";
import { getHttpClient } from "../client/http-client.js";
import { HttpError } from "../types/http.js";

export interface HealthCheckResult {
  isConnected: boolean;
  isLoading: boolean;
  error: HttpError | null;
  refetch: () => void;
}

export interface UseHealthCheckOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
  healthEndpoint?: string;
}

export function useHealthCheck(options: UseHealthCheckOptions = {}): HealthCheckResult {
  const {
    enabled = true,
    refetchInterval = false,
    healthEndpoint = "/health",
  } = options;

  const client = getHttpClient();

  const { data, isLoading, error, refetch } = useQuery<boolean, HttpError>({
    queryKey: ["health-check"],
    queryFn: async () => {
      await client.get(healthEndpoint);
      return true;
    },
    enabled,
    refetchInterval,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });

  return {
    isConnected: data ?? false,
    isLoading,
    error: error ?? null,
    refetch,
  };
}
