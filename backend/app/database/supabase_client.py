from supabase import create_client, Client
from app.core.config import get_settings
from functools import lru_cache


@lru_cache()
def get_supabase() -> Client:
    settings = get_settings()
    url = settings.SUPABASE_URL.strip() if settings.SUPABASE_URL else "https://placeholder.supabase.co"
    key = settings.SUPABASE_SERVICE_ROLE_KEY.strip() if settings.SUPABASE_SERVICE_ROLE_KEY else "dummy-service-role-key"
    return create_client(url, key)
