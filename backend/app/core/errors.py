from __future__ import annotations


class AppError(Exception):
    """Base class for expected, client-safe application errors."""

    status_code: int = 500
    code: str = "internal_error"
    message: str = "An unexpected error occurred."

    def __init__(self, message: str | None = None, *, code: str | None = None) -> None:
        if message is not None:
            self.message = message
        if code is not None:
            self.code = code
        super().__init__(self.message)


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"
    message = "Resource not found."


class AuthRequiredError(AppError):
    status_code = 401
    code = "authentication_required"
    message = "Authentication required."


class PermissionDeniedError(AppError):
    status_code = 403
    code = "permission_denied"
    message = "You are not allowed to perform this action."


class ValidationError(AppError):
    status_code = 422
    code = "validation_error"
    message = "Validation failed."


class ConflictError(AppError):
    status_code = 409
    code = "conflict"
    message = "The request conflicts with the current state."


class RateLimitedError(AppError):
    status_code = 429
    code = "rate_limited"
    message = "Too many requests. Please try again later."


class ServiceUnavailableError(AppError):
    status_code = 503
    code = "service_unavailable"
    message = "This service is temporarily unavailable. Please try again shortly."
