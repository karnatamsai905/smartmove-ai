from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database.supabase_client import get_supabase

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials
    supabase = get_supabase()
    try:
        response = supabase.auth.get_user(token)
        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token"
            )
        return response.user
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


async def require_admin(user=Depends(get_current_user)):
    meta_role = (getattr(user, "user_metadata", None) or {}).get("role")
    if meta_role == "admin":
        return user

    supabase = get_supabase()
    try:
        profile = (
            supabase.table("profiles")
            .select("role")
            .eq("id", user.id)
            .execute()
        )
        if profile.data and profile.data[0].get("role") == "admin":
            return user
    except Exception:
        pass

    if meta_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )
    return user


async def require_driver(user=Depends(get_current_user)):
    meta_role = (getattr(user, "user_metadata", None) or {}).get("role")
    if meta_role in ("admin", "driver"):
        return user

    supabase = get_supabase()
    try:
        profile = (
            supabase.table("profiles")
            .select("role")
            .eq("id", user.id)
            .execute()
        )
        if profile.data and profile.data[0].get("role") in ("admin", "driver"):
            return user
    except Exception:
        pass

    if meta_role not in ("admin", "driver"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Driver access required"
        )
    return user
