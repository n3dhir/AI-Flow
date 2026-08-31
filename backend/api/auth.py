from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session
from database import get_db
from core.security import (
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
    revoke_refresh_token,
    get_current_user,
)
from services import create_user, get_user_by_email, authenticate_user
from schemas import UserRegister, UserLogin, Token, UserResponse

router = APIRouter(prefix="/api", tags=["auth"])


@router.post("/register", response_model=Token)
def register(request: UserRegister, db: Session = Depends(get_db)):
    existing = get_user_by_email(db, request.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = create_user(db, request.email, request.password)
    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(db, user.id)
    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/login", response_model=Token)
def login(request: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(db, user.id)
    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=Token)
def refresh(request: dict, db: Session = Depends(get_db)):
    refresh_token = request.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=400, detail="Refresh token required")

    token = verify_refresh_token(db, refresh_token)
    access_token = create_access_token(data={"sub": token.user_id})
    new_refresh_token = create_refresh_token(db, token.user_id)

    revoke_refresh_token(db, refresh_token)

    return Token(access_token=access_token, refresh_token=new_refresh_token)


@router.post("/logout")
def logout(request: dict, db: Session = Depends(get_db)):
    refresh_token = request.get("refresh_token")
    if refresh_token:
        revoke_refresh_token(db, refresh_token)
    return {"ok": True}


@router.get("/me", response_model=UserResponse)
def me(current_user=Depends(get_current_user)):
    return current_user
