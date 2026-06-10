from datetime import UTC, datetime, timedelta
from uuid import uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext

from .config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def create_access_token(user_id: int) -> tuple[str, str, datetime]:
    settings = get_settings()
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    token_jti = uuid4().hex
    payload = {"sub": str(user_id), "jti": token_jti, "exp": expires_at}
    token = jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)
    return token, token_jti, expires_at


def decode_access_token(token: str) -> tuple[int, str]:
    try:
        payload = jwt.decode(token, get_settings().secret_key, algorithms=[ALGORITHM])
        subject = payload.get("sub")
        token_jti = payload.get("jti")
        if subject is None or token_jti is None:
            raise ValueError("Token missing subject or jti")
        return int(subject), str(token_jti)
    except (JWTError, ValueError) as exc:
        raise ValueError("Invalid token") from exc
