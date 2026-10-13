import { ApiError } from "@/lib/api/client";

export function describeApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return `${error.code} (${error.status}): ${error.message}`;
  }
  return "Unexpected error.";
}
