from fastapi import APIRouter, Depends, HTTPException

from sqlalchemy.orm import Session
from database import get_db
from core.security import create_access_token, get_current_user
from services import create_user, get_user_by_email, authenticate_user
from schemas import UserRegister, UserLogin, Token, UserResponse

router = APIRouter(prefix="/api", tags=["auth"])


@router.post("/register", response_model=Token)
def register(request: UserRegister, db: Session = Depends(get_db)):
    existing = get_user_by_email(db, request.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = create_user(db, request.email, request.password)
    token = create_access_token(data={"sub": user.id})
    return Token(access_token=token)


@router.post("/login", response_model=Token)
def login(request: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(data={"sub": user.id})
    return Token(access_token=token)


@router.get("/me", response_model=UserResponse)
def me(current_user=Depends(get_current_user)):
    return current_user
