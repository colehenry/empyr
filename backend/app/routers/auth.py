from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..deps import get_current_user
from ..models import AuthSession, User
from ..schemas import LoginRequest, TokenResponse, UserCreate, UserPublic
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: UserCreate, session: AsyncSession = Depends(get_session)) -> TokenResponse:
    existing = await session.scalar(
        select(User).where(or_(User.email == payload.email.lower(), User.display_name == payload.display_name))
    )
    if existing is not None:
        raise HTTPException(status_code=409, detail="Email or display name already exists")

    user = User(
        email=payload.email.lower(),
        display_name=payload.display_name,
        password_hash=hash_password(payload.password),
    )
    session.add(user)
    await session.flush()

    token, token_jti, expires_at = create_access_token(user.id)
    session.add(AuthSession(user_id=user.id, token_jti=token_jti, expires_at=expires_at))
    await session.commit()
    return TokenResponse(access_token=token, expires_at=expires_at)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, session: AsyncSession = Depends(get_session)) -> TokenResponse:
    user = await session.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token, token_jti, expires_at = create_access_token(user.id)
    session.add(AuthSession(user_id=user.id, token_jti=token_jti, expires_at=expires_at))
    await session.commit()
    return TokenResponse(access_token=token, expires_at=expires_at)


@router.get("/me", response_model=UserPublic)
async def me(user: User = Depends(get_current_user)) -> UserPublic:
    return UserPublic.model_validate(user, from_attributes=True)
