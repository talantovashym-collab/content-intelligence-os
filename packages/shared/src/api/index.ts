// Shared API types and utilities

// Use globalThis.crypto for cross-environment compatibility (Node.js + browser)
const getRandomUUID = (): string => {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  return g.crypto?.randomUUID?.() ?? Math.random().toString(36).substring(2, 15);
};

export interface ApiResponse<T> {
  data: T;
  meta?: {
    timestamp: string;
    request_id: string;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime_seconds: number;
  checks: {
    database: boolean;
    redis: boolean;
    ai_providers: Record<string, boolean>;
  };
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiEndpoint {
  method: HttpMethod;
  path: string;
  description: string;
  requires_auth: boolean;
  roles?: string[];
}

// Common query parameters
export interface ListParams {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, string | number | boolean>;
}

export interface ListResponse<T> extends PaginatedResponse<T> {}

// Error codes
export const ErrorCodes = {
  // Auth
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',

  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_CONSTRAINT_VIOLATION: 'VALIDATION_CONSTRAINT_VIOLATION',

  // Resources
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  RESOURCE_LOCKED: 'RESOURCE_LOCKED',

  // Operations
  OPERATION_FAILED: 'OPERATION_FAILED',
  OPERATION_TIMEOUT: 'OPERATION_TIMEOUT',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
  OPERATION_RATE_LIMITED: 'OPERATION_RATE_LIMITED',

  // External
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  EXTERNAL_API_TIMEOUT: 'EXTERNAL_API_TIMEOUT',
  EXTERNAL_API_RATE_LIMITED: 'EXTERNAL_API_RATE_LIMITED',

  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// Standard error response
export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
  meta: {
    timestamp: string;
    request_id: string;
    path: string;
  };
}

// Success response wrapper
export function createSuccessResponse<T>(data: T, meta?: Partial<ApiResponse<T>['meta']>): ApiResponse<T> {
  return {
    data,
    meta: {
      timestamp: new Date().toISOString(),
      request_id: getRandomUUID(),
      ...meta,
    },
  };
}

export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
  requestId?: string,
  path?: string
): ErrorResponse {
  return {
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      request_id: requestId || getRandomUUID(),
      path: path || '',
    },
  };
}