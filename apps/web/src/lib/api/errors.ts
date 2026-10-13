import { ApiError } from "@/lib/api/client";

const statusMessages: Record<number, string> = {
  401: "Please sign in to continue.",
  403: "You don’t have access to that.",
  404: "We couldn’t find what you were looking for.",
  409: "That action isn’t available in the current state.",
  422: "Please check the highlighted details and try again.",
  429: "Please wait a moment before trying again.",
};

export interface ApiErrorInfo {
  status: number;
  code: string;
  message: string;
  fieldErrors: Record<string, string>;
}

function fieldErrorsFrom(fields: unknown): Record<string, string> {
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields as Record<string, unknown>)) {
    if (typeof value === "string") out[key] = value;
    else if (Array.isArray(value)) out[key] = value.map(String).join(", ");
    else if (value != null) out[key] = String(value);
  }
  return out;
}

export function toApiErrorInfo(error: unknown): ApiErrorInfo {
  if (error instanceof ApiError) {
    const generic = !error.message || error.message === "Something went wrong.";
    const message =
      error.status === 0
        ? error.message
        : generic
          ? (statusMessages[error.status] ?? error.message)
          : error.message;
    return {
      status: error.status,
      code: error.code,
      message,
      fieldErrors: fieldErrorsFrom(error.fields),
    };
  }
  return {
    status: 0,
    code: "unknown_error",
    message: "Something went wrong. Please try again.",
    fieldErrors: {},
  };
}

export function describeApiError(error: unknown): string {
  return toApiErrorInfo(error).message;
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}
