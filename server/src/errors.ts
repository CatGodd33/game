export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const Errors = {
  unauthorized: (message = "Debes iniciar una sesión para continuar.") =>
    new AppError(401, "UNAUTHORIZED", message),
  forbidden: (message = "No tienes permiso para realizar esta acción.") =>
    new AppError(403, "FORBIDDEN", message),
  notFound: (message = "No se ha encontrado el recurso.") =>
    new AppError(404, "NOT_FOUND", message),
  conflict: (message: string) => new AppError(409, "CONFLICT", message),
  validation: (message: string, details?: unknown) =>
    new AppError(400, "VALIDATION_ERROR", message, details),
  rateLimited: (message = "Demasiadas acciones. Espera un momento.") =>
    new AppError(429, "RATE_LIMITED", message),
  internal: (message = "Ha ocurrido un error interno.") =>
    new AppError(500, "INTERNAL_ERROR", message),
};

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
