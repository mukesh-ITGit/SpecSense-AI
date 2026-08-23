"""
Authentication API routes.

Endpoints:
  POST /api/v1/auth/register    — Create new account
  POST /api/v1/auth/login       — Login with email + password
  GET  /api/v1/auth/me          — Get current user profile
  POST /api/v1/auth/logout      — Logout (client-side token removal)

HTTP status codes:
  200  — Success
  400  — Validation / bad request
  401  — Invalid credentials / unauthenticated
  409  — Conflict (email already registered)
  500  — Internal server error
"""

from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict, Any
import logging

from app.schemas.auth import UserLogin, UserRegister, TokenResponse, UserResponse
from app.services.auth_service import auth_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Dependency — resolve current authenticated user from Bearer token
# ---------------------------------------------------------------------------

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Dict[str, Any]:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = auth_service.decode_token(token)

    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email = payload["sub"]
    user = auth_service.get_user_by_email(email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account not found. The account may have been removed.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("is_active", 1):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your account has been deactivated. Please contact support.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


# ---------------------------------------------------------------------------
# POST /auth/login
# ---------------------------------------------------------------------------

@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin):
    """
    Authenticate with email and password.

    Returns:
      200: access_token + user on success
      401: Incorrect email or password
    """
    try:
        user = auth_service.authenticate_user(
            credentials.email, credentials.password
        )
    except Exception as exc:
        logger.exception("Unexpected error during login")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal server error occurred during authentication. Please try again.",
        ) from exc

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = auth_service.create_access_token(
        data={"sub": user["email"], "name": user["name"], "role": user["role"]}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            company=user["company"],
            avatar_url=user.get("avatar_url"),
        ),
    }


# ---------------------------------------------------------------------------
# POST /auth/register
# ---------------------------------------------------------------------------

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister):
    """
    Register a new account.

    Returns:
      201: access_token + user on success
      409: Email already registered
      400: Validation error
    """
    try:
        user = auth_service.create_user(
            email=user_in.email,
            password=user_in.password,
            name=user_in.name,
            role=user_in.role or "Catalog Specialist",
            company=user_in.company or "SpecSense Industrial Corp",
        )
    except ValueError as exc:
        # Duplicate email
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected error during registration")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal server error occurred during registration. Please try again.",
        ) from exc

    access_token = auth_service.create_access_token(
        data={"sub": user["email"], "name": user["name"], "role": user["role"]}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            company=user["company"],
            avatar_url=user.get("avatar_url"),
        ),
    }


# ---------------------------------------------------------------------------
# GET /auth/me
# ---------------------------------------------------------------------------

@router.get("/me", response_model=UserResponse)
def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Return the currently authenticated user's profile."""
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        role=current_user["role"],
        company=current_user["company"],
        avatar_url=current_user.get("avatar_url"),
    )


# ---------------------------------------------------------------------------
# POST /auth/logout
# ---------------------------------------------------------------------------

@router.post("/logout")
def logout():
    """
    Logout current session.
    The client is responsible for discarding the token.
    Server-side: stateless JWT — no token blocklist currently implemented.
    """
    return {"message": "Logged out successfully. Please discard your access token."}
