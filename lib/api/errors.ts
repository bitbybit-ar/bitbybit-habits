export class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "No autenticado") { super(401, message); }
}

export class NotFoundError extends ApiError {
  constructor(resource = "Recurso") { super(404, `${resource} no encontrado`); }
}

export class BadRequestError extends ApiError {
  constructor(message: string) { super(400, message); }
}

export class ForbiddenError extends ApiError {
  constructor(message = "No autorizado") { super(403, message); }
}

export class ConflictError extends ApiError {
  constructor(message: string) { super(409, message); }
}
