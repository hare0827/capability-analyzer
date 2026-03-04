from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=8)


class TokenResponse(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"
    expires_in:    int   # Access Token 유효 시간 (초)


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    user_id: str
    email:   str
    role:    str


class RegisterRequest(BaseModel):
    email:    EmailStr
    password: str = Field(..., min_length=8)
    role:     str = Field(default="engineer", pattern="^(admin|engineer|viewer)$")
