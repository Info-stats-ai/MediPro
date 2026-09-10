import asyncio
import hashlib
from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from app.config import Settings, get_settings
from app.models import AuthUser

bearer = HTTPBearer(auto_error=False)


@lru_cache(maxsize=4)
def _jwks_client(url: str) -> PyJWKClient:
    return PyJWKClient(url, cache_keys=True)


def hash_user_id(user_id: str) -> str:
    return hashlib.sha256(user_id.encode()).hexdigest()[:12]


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    settings: Settings = Depends(get_settings),
) -> AuthUser:
    if settings.dev_auth_bypass:
        user = AuthUser(id=settings.dev_user_id, claims={"dev_bypass": True})
        request.state.user_hash = hash_user_id(user.id)
        return user
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    if not settings.clerk_issuer:
        raise HTTPException(status_code=500, detail="Authentication is not configured")

    token = credentials.credentials
    try:
        client = _jwks_client(f"{settings.clerk_issuer.rstrip('/')}/.well-known/jwks.json")
        key = await asyncio.to_thread(client.get_signing_key_from_jwt, token)
        kwargs = {
            "algorithms": ["RS256"],
            "issuer": settings.clerk_issuer,
            "options": {"require": ["exp", "iat", "sub"]},
        }
        if settings.clerk_audience:
            kwargs["audience"] = settings.clerk_audience
        else:
            kwargs["options"]["verify_aud"] = False
        claims = jwt.decode(token, key.key, **kwargs)
        user = AuthUser(id=claims["sub"], claims=claims)
        request.state.user_hash = hash_user_id(user.id)
        return user
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Authentication service unavailable") from exc


async def require_admin(
    user: AuthUser = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> AuthUser:
    if user.id not in settings.admins and not user.claims.get("metadata", {}).get("role") == "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
