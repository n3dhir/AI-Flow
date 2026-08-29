from fastapi import APIRouter, Depends, HTTPException

from auth import Token, UserLogin, UserRegister, get_current_user, get_db, hash_password, verify_password, create_access_token
from database import User

router = APIRouter(prefix="/api", tags=["auth"])


@router.post("/register")
def register(request: UserRegister, db=Depends(get_db)):
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=request.email,
        password_hash=hash_password(request.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(data={"sub": user.id})
    return Token(access_token=token)


@router.post("/login")
def login(request: UserLogin, db=Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(data={"sub": user.id})
    return Token(access_token=token)


@router.get("/me")
def me(current_user=Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email}
