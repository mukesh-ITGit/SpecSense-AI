"""
Authentication service — PERSISTENT SQLite backend.

All users are stored in app/database/app.db.

Rules:
- Users survive backend restarts.
- Users survive computer restarts.
- Passwords are hashed with bcrypt, NEVER stored plaintext.
- Email is always normalized (lowercased + stripped) before storage.
- JWTs are signed with a stable secret loaded from environment/config.
- No in-memory user storage. No demo users seeded on startup.
"""

import uuid
import datetime
from typing import Optional, Dict, Any

import bcrypt
import jwt

from app.config import settings
from app.database.connection import get_connection, init_db

# ---------------------------------------------------------------------------
# Ensure tables exist on first import (idempotent — safe to call many times)
# ---------------------------------------------------------------------------
init_db()


# ---------------------------------------------------------------------------
# Password helpers
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt. Never store plaintext."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password[:72].encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password[:72].encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Internal DB helpers
# ---------------------------------------------------------------------------

def _row_to_dict(row) -> Dict[str, Any]:
    """Convert a sqlite3.Row to a plain dict."""
    return dict(row)


# ---------------------------------------------------------------------------
# AuthService — all operations hit the SQLite database
# ---------------------------------------------------------------------------

class AuthService:

    # ------------------------------------------------------------------
    # User lookup
    # ------------------------------------------------------------------

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """
        Fetch a user by email (case-insensitive).
        Returns None if not found.
        """
        email_key = email.lower().strip()
        conn = get_connection()
        try:
            row = conn.execute(
                "SELECT * FROM users WHERE email = ?", (email_key,)
            ).fetchone()
            return _row_to_dict(row) if row else None
        finally:
            conn.close()

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Fetch a user by ID. Returns None if not found."""
        conn = get_connection()
        try:
            row = conn.execute(
                "SELECT * FROM users WHERE id = ?", (user_id,)
            ).fetchone()
            return _row_to_dict(row) if row else None
        finally:
            conn.close()

    # ------------------------------------------------------------------
    # Registration
    # ------------------------------------------------------------------

    def create_user(
        self,
        email: str,
        password: str,
        name: str,
        role: str = "Catalog Specialist",
        company: str = "SpecSense Industrial Corp",
    ) -> Dict[str, Any]:
        """
        Create a new user and persist to SQLite.

        Raises ValueError if email already exists.
        Email is normalised (lowercase + stripped) before storage.
        Password is bcrypt-hashed — NEVER stored in plaintext.
        """
        email_key = email.lower().strip()

        # Duplicate check
        existing = self.get_user_by_email(email_key)
        if existing:
            raise ValueError("An account with this email already exists.")

        user_id = f"usr_{uuid.uuid4().hex[:12]}"
        password_hash = hash_password(password)
        now = datetime.datetime.utcnow().isoformat()

        conn = get_connection()
        try:
            conn.execute(
                """
                INSERT INTO users
                    (id, email, name, password_hash, role, company, avatar_url,
                     is_active, is_verified, created_at, updated_at, last_login_at)
                VALUES
                    (?, ?, ?, ?, ?, ?, NULL, 1, 0, ?, ?, NULL)
                """,
                (user_id, email_key, name, password_hash, role, company, now, now),
            )
            conn.commit()
        finally:
            conn.close()

        # Return fresh record from DB
        return self.get_user_by_email(email_key)  # type: ignore[return-value]

    # ------------------------------------------------------------------
    # Authentication
    # ------------------------------------------------------------------

    def authenticate_user(
        self, email: str, password: str
    ) -> Optional[Dict[str, Any]]:
        """
        Verify email + password against the database.

        Returns the user dict on success, None on failure.
        Updates last_login_at on success.
        """
        user = self.get_user_by_email(email)
        if not user:
            return None

        # Inactive account — treat as wrong credentials (don't leak info)
        if not user.get("is_active", 1):
            return None

        if not verify_password(password, user["password_hash"]):
            return None

        # Update last_login_at
        now = datetime.datetime.utcnow().isoformat()
        conn = get_connection()
        try:
            conn.execute(
                "UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?",
                (now, now, user["id"]),
            )
            conn.commit()
        finally:
            conn.close()

        # Return updated user
        return self.get_user_by_id(user["id"])

    # ------------------------------------------------------------------
    # JWT tokens
    # ------------------------------------------------------------------

    def create_access_token(
        self,
        data: dict,
        expires_delta: Optional[datetime.timedelta] = None,
    ) -> str:
        """Create a signed JWT access token."""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.datetime.now(datetime.timezone.utc) + expires_delta
        else:
            expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
                minutes=settings.access_token_expire_minutes
            )
        to_encode.update({"exp": expire, "iat": datetime.datetime.now(datetime.timezone.utc)})
        return jwt.encode(
            to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm
        )

    def decode_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Decode and validate a JWT token.
        Returns payload dict on success, None if invalid/expired.
        """
        try:
            payload = jwt.decode(
                token,
                settings.jwt_secret_key,
                algorithms=[settings.jwt_algorithm],
            )
            return payload
        except jwt.PyJWTError:
            return None

    # ------------------------------------------------------------------
    # Password helpers (kept on service for callers)
    # ------------------------------------------------------------------

    def verify_password(self, plain: str, hashed: str) -> bool:
        return verify_password(plain, hashed)

    def get_password_hash(self, password: str) -> str:
        return hash_password(password)


# ---------------------------------------------------------------------------
# Singleton instance — imported by all route handlers
# ---------------------------------------------------------------------------
auth_service = AuthService()
