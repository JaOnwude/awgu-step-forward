import { env } from "@/lib/env";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const CSRF_COOKIE_NAME = "awgu_csrf";
const CSRF_HEADER_NAME = "X-CSRF-Token";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string; fields?: unknown };
  detail?: string;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  csrf?: boolean;
  headers?: Record<string, string>;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, csrf = false, headers: extraHeaders } = options;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...extraHeaders,
  };

  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (csrf) {
    const token = readCookie(CSRF_COOKIE_NAME);
    if (token) headers[CSRF_HEADER_NAME] = token;
  }

  let response: Response;
  try {
    response = await fetch(`${env.apiBaseUrl}${path}`, {
      method,
      headers,
      credentials: "include",
      cache: "no-store",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      "network_error",
      "Cannot reach the server. Check your connection and try again.",
    );
  }

  const text = await response.text();
  const parsed = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const envelope = (parsed ?? {}) as ErrorEnvelope;
    const code = envelope.error?.code ?? "unknown_error";
    const message =
      envelope.error?.message ?? envelope.detail ?? "Something went wrong.";
    throw new ApiError(response.status, code, message, envelope.error?.fields);
  }

  return parsed as T;
}
