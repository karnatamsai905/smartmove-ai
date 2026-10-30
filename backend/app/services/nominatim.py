import logging
from typing import Optional, Tuple, Dict
import httpx
from app.core.config import get_settings

logger = logging.getLogger(__name__)

class NominatimService:
    def __init__(self):
        self.settings = get_settings()
        self.base_url = self.settings.NOMINATIM_BASE_URL.rstrip('/')
        # Cache address -> (lat, lng, display_name)
        self._cache: Dict[str, Tuple[float, float, str]] = {}

    async def geocode(self, address: str) -> Optional[Tuple[float, float, str]]:
        """
        Geocodes an address string to (latitude, longitude, formatted_address).
        Includes in-memory cache to respect Nominatim rate limits.
        """
        clean_addr = address.strip()
        if not clean_addr:
            return None

        # Check cache
        cache_key = clean_addr.lower()
        if cache_key in self._cache:
            return self._cache[cache_key]

        headers = {
            "User-Agent": "SmartMoveAI-Platform/1.0 (logistics-platform@smartmove.local)",
            "Accept-Language": "en"
        }
        params = {
            "q": clean_addr,
            "format": "json",
            "limit": 1,
            "addressdetails": 1
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(f"{self.base_url}/search", params=params, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    if data and len(data) > 0:
                        top = data[0]
                        lat = float(top["lat"])
                        lng = float(top["lon"])
                        display_name = top.get("display_name", clean_addr)
                        result = (lat, lng, display_name)
                        self._cache[cache_key] = result
                        return result
        except Exception as e:
            logger.error(f"Geocoding error for '{clean_addr}': {e}")

        # Return default Chennai warehouse coords if geocoding fails
        return None

nominatim_service = NominatimService()

