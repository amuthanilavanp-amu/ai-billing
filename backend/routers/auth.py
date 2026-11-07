"""Authentication router"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import bcrypt
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.user_models import User, UserRole
from models.company_models import Company

router = APIRouter()

SECRET_KEY = "smartbiz-dev-secret-change-in-production-2024"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    username: str
    full_name: str
    role: str
    company_id: Optional[int]


class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    email: Optional[str] = None
    role: str = "cashier"
    company_id: Optional[int] = None


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8")[:72], hashed_password.encode("utf-8"))
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub", "")
        if not username:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.username == username, User.is_active == True).first()
    if not user:
        raise credentials_exception
    return user


@router.post("/token", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is disabled")

    user.last_login = datetime.utcnow()
    db.commit()

    access_token = create_access_token(data={"sub": user.username, "user_id": user.id})
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        username=user.username,
        full_name=user.full_name,
        role=user.role.value,
        company_id=user.company_id,
    )


@router.post("/register", response_model=Token)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user / create a new username & password."""
    clean_username = user_data.username.strip()
    if not clean_username:
        raise HTTPException(status_code=400, detail="Username cannot be blank.")
    if len(user_data.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters long.")

    existing_user = db.query(User).filter(User.username == clean_username).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail=f"Username '{clean_username}' already exists. Please choose a different username or sign in.",
        )

    clean_email = user_data.email.strip() if user_data.email and user_data.email.strip() else None
    if clean_email:
        existing_email = db.query(User).filter(User.email == clean_email).first()
        if existing_email:
            clean_email = None  # Don't fail registration if placeholder email clashes

    # Auto-link to existing company if none provided
    company_id = user_data.company_id
    if not company_id:
        first_company = db.query(Company).first()
        if first_company:
            company_id = first_company.id

    full_name = user_data.full_name.strip() if user_data.full_name and user_data.full_name.strip() else clean_username

    user = User(
        username=clean_username,
        email=clean_email,
        full_name=full_name,
        hashed_password=get_password_hash(user_data.password),
        role=UserRole.ADMIN,
        is_super_admin=True,
        company_id=company_id,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(data={"sub": user.username, "user_id": user.id})
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        username=user.username,
        full_name=user.full_name,
        role=user.role.value if hasattr(user.role, "value") else str(user.role),
        company_id=user.company_id,
    )


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "role": current_user.role.value,
        "company_id": current_user.company_id,
        "is_active": current_user.is_active,
    }


@router.get("/setup-status")
def setup_status(db: Session = Depends(get_db)):
    """Check if initial setup has been completed."""
    user_count = db.query(User).count()
    return {"needs_setup": user_count == 0}
