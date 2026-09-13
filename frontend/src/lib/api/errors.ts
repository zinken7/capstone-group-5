export class ApiError extends Error {
  readonly status: number | undefined

  constructor(message: string, status?: number, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ApiError'
    this.status = status
  }
}
