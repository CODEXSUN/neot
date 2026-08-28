export type AppErrorInput<TDetails = unknown> = {
  code: string;
  details?: TDetails;
  message: string;
  statusCode?: number;
};

export class AppError<TDetails = unknown> extends Error {
  readonly code: string;
  readonly details?: TDetails;
  readonly statusCode: number;

  constructor(input: AppErrorInput<TDetails>) {
    super(input.message);
    this.name = "AppError";
    this.code = input.code;
    this.statusCode = input.statusCode ?? 500;

    if ("details" in input) {
      this.details = input.details;
    }
  }

  static validation(message: string, details?: unknown) {
    return new AppError({ code: "VALIDATION_ERROR", message, statusCode: 400, details });
  }

  static unauthorized(message = "Unauthorized", details?: unknown) {
    return new AppError({ code: "UNAUTHORIZED", message, statusCode: 401, details });
  }

  static forbidden(message = "Forbidden", details?: unknown) {
    return new AppError({ code: "FORBIDDEN", message, statusCode: 403, details });
  }

  static notFound(message = "Not Found", details?: unknown) {
    return new AppError({ code: "NOT_FOUND", message, statusCode: 404, details });
  }

  static conflict(message: string, details?: unknown) {
    return new AppError({ code: "CONFLICT", message, statusCode: 409, details });
  }

  static internal(message = "Internal Server Error", details?: unknown) {
    return new AppError({ code: "INTERNAL_ERROR", message, statusCode: 500, details });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
