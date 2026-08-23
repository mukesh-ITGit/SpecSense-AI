"""
Persistent SQLite database connection and schema management.

Database path: <project_root>/app/database/app.db

Rules:
- Path is resolved from THIS FILE's location — never from cwd.
- Tables are created with IF NOT EXISTS — NEVER dropped.
- Existing users and data are ALWAYS preserved on startup.
- IDEMPOTENT: safe to run backend 1 time or 1000 times.
"""

import sqlite3
import os
from pathlib import Path

# ---------------------------------------------------------------------------
# STABLE, ABSOLUTE DATABASE PATH
# Resolved from THIS file's directory so it never changes regardless of
# which directory the backend is launched from.
# ---------------------------------------------------------------------------
_DB_DIR = Path(__file__).parent.resolve()
DB_PATH = _DB_DIR / "app.db"

# Ensure the directory exists (it already should since this file lives in it)
_DB_DIR.mkdir(parents=True, exist_ok=True)


def get_connection() -> sqlite3.Connection:
    """
    Return a new SQLite connection to the persistent app database.
    Row factory is set so rows behave like dicts.
    Foreign keys are enforced.
    """
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")  # Better concurrency
    return conn


def init_db() -> None:
    """
    Create all required tables if they do not already exist.
    SAFE: uses IF NOT EXISTS — existing data is NEVER deleted.
    Calling this 100 times is identical to calling it once.
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()

        # ----------------------------------------------------------------
        # Users table
        # ----------------------------------------------------------------
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id              TEXT PRIMARY KEY,
                email           TEXT NOT NULL UNIQUE,
                name            TEXT NOT NULL,
                password_hash   TEXT NOT NULL,
                role            TEXT NOT NULL DEFAULT 'Catalog Specialist',
                company         TEXT NOT NULL DEFAULT 'SpecSense Industrial Corp',
                avatar_url      TEXT,
                is_active       INTEGER NOT NULL DEFAULT 1,
                is_verified     INTEGER NOT NULL DEFAULT 0,
                created_at      TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
                last_login_at   TEXT
            )
        """)

        # Index on email for fast lookups (email is already UNIQUE so indexed,
        # but an explicit index makes it clear)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)
        """)

        # ----------------------------------------------------------------
        # Password reset tokens table
        # ----------------------------------------------------------------
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id          TEXT PRIMARY KEY,
                user_id     TEXT NOT NULL,
                token_hash  TEXT NOT NULL UNIQUE,
                expires_at  TEXT NOT NULL,
                used        INTEGER NOT NULL DEFAULT 0,
                created_at  TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)

        # Seed default enterprise demo users if missing
        cursor.execute("SELECT COUNT(*) FROM users WHERE email = 'sarah.jenkins@specsense.ai'")
        if cursor.fetchone()[0] == 0:
            import bcrypt
            import uuid
            # Pre-compute or generate bcrypt hashes for demo accounts
            sarah_hash = bcrypt.hashpw(b"password123", bcrypt.gensalt(rounds=10)).decode("utf-8")
            admin_hash = bcrypt.hashpw(b"Admin123!", bcrypt.gensalt(rounds=10)).decode("utf-8")
            
            cursor.execute("""
                INSERT INTO users (id, email, name, password_hash, role, company, is_active, is_verified, created_at, updated_at)
                VALUES 
                (?, 'sarah.jenkins@specsense.ai', 'Sarah Jenkins', ?, 'Catalog Lead', 'SpecSense Industrial Corp', 1, 1, datetime('now'), datetime('now')),
                (?, 'admin@specsense.ai', 'Alex Mercer', ?, 'Chief Data Officer', 'SpecSense Industrial Corp', 1, 1, datetime('now'), datetime('now'))
            """, (f"usr_{uuid.uuid4().hex[:12]}", sarah_hash, f"usr_{uuid.uuid4().hex[:12]}", admin_hash))

        conn.commit()
    finally:
        conn.close()
