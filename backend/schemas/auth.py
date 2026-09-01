import re

from pydantic import BaseModel, field_validator


class UserRegister(BaseModel):
    email: str
    password: str

    @field_validator('email')
    @classmethod
    def email_format(cls, v: str) -> str:
        if not re.fullmatch(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", v):
            raise ValueError('Invalid email format')
        return v

    @field_validator('password')
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters')
        return v


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str

    class Config:
        from_attributes = True
