import type { ApiErrorCode } from '../../shared/types.js'

export class ApiFailure extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly options: {
      headers?: Record<string, string>
      fieldErrors?: Record<string, string>
    } = {},
  ) {
    super(message)
  }
}
