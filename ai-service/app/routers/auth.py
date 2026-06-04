"""Authentication endpoints."""
import os
import secrets
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from app.config import SECRET_KEY, API_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, ENABLE_AUTH

router = APIRouter(prefix="/auth", tags=["auth"])

# Auto-generate keys if not set (security fix)
_active_secret = SECRET_KEY or secrets.token_hex(32)
_active_api_key = API_KEY or secrets.token_hex(16)

try:
    from jose import JWTError, jwt
    HAS_JWT = True
except ImportError:
    HAS_JWT = False

security = HTTPBearer() if ENABLE_AUTH else None


class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int


class TokenData(BaseModel):
    username: Optional[str] = None


class User(BaseModel):
    username: str


def _create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, _active_secret, algorithm=ALGORITHM)


def _verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    if not ENABLE_AUTH:
        return "demo_user"
    try:
        payload = jwt.decode(credentials.credentials, _active_secret, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Could not validate credentials")
        return username
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")


def get_current_user(token: str = Depends(_verify_token)) -> User:
    return User(username="demo_user")


@router.post("/token", response_model=Token)
async def login(username: str = "space-analyzer", password: str = "demo"):
    if not ENABLE_AUTH:
        return Token(access_token="mock_token", token_type="bearer", expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token = _create_access_token(data={"sub": username}, expires_delta=expires)
    return Token(access_token=token, token_type="bearer", expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60)


@router.get("/verify")
async def verify():
    return {"valid": True, "username": "demo_user"}


@router.get("/me")
async def me():
    return User(username="demo_user")


@router.get("/api-key/verify")
async def verify_api_key(x_api_key: str = None):
    if x_api_key and x_api_key == _active_api_key:
        return {"valid": True}
    return {"valid": False}
