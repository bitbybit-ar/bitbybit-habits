export class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized") { super(401, message); }
}

export class NotFoundError extends ApiError {
  constructor(resource = "Resource") { super(404, `${resource} not found`); }
}

export class BadRequestError extends ApiError {
  constructor(message: string) { super(400, message); }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden") { super(403, message); }
}

export class ConflictError extends ApiError {
  constructor(message: string) { super(409, message); }
}

export class RateLimitError extends ApiError {
  public retryAfterMs: number;
  constructor(retryAfterMs: number, message = "Too many requests. Try again later.") {
    super(429, message);
    this.retryAfterMs = retryAfterMs;
  }
}
