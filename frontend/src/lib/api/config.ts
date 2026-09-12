/** Vite replaces browser environment variables at build time. */
export function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL?.trim() || '/api').replace(/\/+$/, '')
}
