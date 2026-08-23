"""
Authentication schemas — request/response models for auth endpoints.
"""

from pydantic import BaseModel, Field, EmailStr, field_validator, ConfigDict
from typing import Optional


class UserLogin(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=1, description="User password")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        """Normalize email: strip whitespace and lowercase."""
        return v.strip().lower()


class UserRegister(BaseModel):
    email: str = Field(..., min_length=3, description="User email address")
    password: str = Field(..., min_length=8, description="Password (min 8 characters)")
    name: str = Field(..., min_length=1, description="Full name")
    role: Optional[str] = Field(default="Catalog Specialist", description="Job role")
    company: Optional[str] = Field(
        default="SpecSense Industrial Corp", description="Company name"
    )

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        """Normalize email: strip whitespace and lowercase."""
        normalized = v.strip().lower()
        # Basic email format check
        if "@" not in normalized or "." not in normalized.split("@")[-1]:
            raise ValueError("Please enter a valid email address.")
        return normalized

    @field_validator("name")
    @classmethod
    def strip_name(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Name cannot be empty.")
        return stripped

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return v


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    name: str
    role: str
    company: str
    avatar_url: Optional[str] = None



class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
