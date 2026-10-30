import math
import logging
from typing import List, Tuple, Dict, Any, Optional
import httpx
from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Haversine distance fallback in meters
def haversine_distance(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """Calculates great-circle distance between two (lat, lng) pairs in meters."""
    lat1, lon1 = coord1
    lat2, lon2 = coord2
    R = 6371000  # radius of Earth in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class OSRMService:
    def __init__(self):
        self.settings = get_settings()
        self.base_url = self.settings.OSRM_BASE_URL.rstrip('/')
        self._matrix_cache: Dict[str, Any] = {}

    async def get_distance_matrix(
        self, coordinates: List[Tuple[float, float]]
    ) -> Tuple[List[List[float]], List[List[float]]]:
        """
        Coordinates format: [(lat, lng), ...]
        Returns:
            (distance_matrix_meters, duration_matrix_seconds)
        """
        n = len(coordinates)
        if n == 0:
            return [], []
        if n == 1:
            return [[0.0]], [[0.0]]

        # OSRM expects coordinates in lng,lat order
        coords_str = ";".join([f"{lng},{lat}" for lat, lng in coordinates])
        url = f"{self.base_url}/table/v1/driving/{coords_str}?annotations=distance,duration"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    if data.get("code") == "Ok":
                        distances = data.get("distances", [])
                        durations = data.get("durations", [])
                        return distances, durations
        except Exception as e:
            logger.warning(f"OSRM table service failed or timed out ({e}). Falling back to Haversine calculation.")

        # Fallback using Haversine with 1.35 road winding factor and 30 km/h average speed
        distances = []
        durations = []
        avg_speed_mps = 30 * 1000 / 3600  # ~8.33 m/s

        for i in range(n):
            dist_row = []
            dur_row = []
            for j in range(n):
                if i == j:
                    dist_row.append(0.0)
                    dur_row.append(0.0)
                else:
                    h_dist = haversine_distance(coordinates[i], coordinates[j]) * 1.35
                    dist_row.append(round(h_dist, 1))
                    dur_row.append(round(h_dist / avg_speed_mps, 1))
            distances.append(dist_row)
            durations.append(dur_row)

        return distances, durations

    async def get_route_geometry(
        self, coordinates: List[Tuple[float, float]]
    ) -> Dict[str, Any]:
        """
        Calculates road geometry for visited coordinates in sequence.
        Returns GeoJSON feature geometry and overview metrics.
        """
        if len(coordinates) < 2:
            return {
                "type": "LineString",
                "coordinates": [[lng, lat] for lat, lng in coordinates],
                "distance_km": 0.0,
                "duration_min": 0.0,
            }

        coords_str = ";".join([f"{lng},{lat}" for lat, lng in coordinates])
        url = f"{self.base_url}/route/v1/driving/{coords_str}?overview=full&geometries=geojson"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    if data.get("code") == "Ok" and data.get("routes"):
                        route = data["routes"][0]
                        return {
                            "type": "LineString",
                            "coordinates": route["geometry"]["coordinates"],
                            "distance_km": round(route.get("distance", 0) / 1000, 2),
                            "duration_min": round(route.get("duration", 0) / 60, 1),
                        }
        except Exception as e:
            logger.warning(f"OSRM route geometry failed ({e}). Returning fallback coordinate path.")

        # Fallback to straight line coordinate path
        total_m = sum(
            haversine_distance(coordinates[i], coordinates[i + 1]) * 1.35
            for i in range(len(coordinates) - 1)
        )
        return {
            "type": "LineString",
            "coordinates": [[lng, lat] for lat, lng in coordinates],
            "distance_km": round(total_m / 1000, 2),
            "duration_min": round((total_m / 1000) / 30 * 60, 1),
        }

osrm_service = OSRMService()

