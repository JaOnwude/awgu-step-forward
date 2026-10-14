export const env = {
  // Use the same host name as the web app (localhost, not 127.0.0.1). Browsers
  // treat different host names as different sites, so the SameSite session
  // cookie would not be sent and the CSRF cookie could not be read.
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
} as const;
