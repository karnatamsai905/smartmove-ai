import logging
import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.core.config import get_settings
from app.core.security import require_admin
from app.database.supabase_client import get_supabase
from app.services.osrm import osrm_service
from app.optimization.vrp_solver import VRPSolver

logger = logging.getLogger(__name__)
router = APIRouter()

class OptimizationRequest(BaseModel):
    mode: str = "balanced"  # 'distance', 'time', 'priority', 'balanced'
    vehicle_ids: Optional[List[str]] = None
    delivery_ids: Optional[List[str]] = None

@router.post("/generate")
async def generate_route_plan(req: OptimizationRequest, user=Depends(require_admin)):
    """
    Executes OR-Tools VRP multi-vehicle route optimization:
    1. Fetches pending deliveries and available vehicles from Supabase
    2. Computes road distance & duration matrix via OSRM
    3. Runs OR-Tools solver with capacity & priority constraints
    4. Computes OSRM road geometry for each vehicle's visiting path
    5. Saves draft route_plan and route_stops in Supabase
    """
    supabase = get_supabase()
    settings = get_settings()
    warehouse_coord = (settings.WAREHOUSE_LAT, settings.WAREHOUSE_LNG)

    # 1. Fetch deliveries
    deliv_query = supabase.table("deliveries").select("*").in_("status", ["pending", "assigned"])
    if req.delivery_ids:
        deliv_query = deliv_query.in_("id", req.delivery_ids)
    deliv_res = deliv_query.execute()
    deliveries = deliv_res.data or []

    if not deliveries:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pending deliveries found to optimize."
        )

    # 2. Fetch available vehicles
    veh_query = supabase.table("vehicles").select("*").in_("status", ["available", "on_delivery"])
    if req.vehicle_ids:
        veh_query = veh_query.in_("id", req.vehicle_ids)
    veh_res = veh_query.execute()
    vehicles = veh_res.data or []

    if not vehicles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No available vehicles found for route assignment."
        )

    # 3. Build coordinate list: [depot, deliv_1, deliv_2, ...]
    all_coords = [warehouse_coord] + [(float(d["lat"]), float(d["lng"])) for d in deliveries]

    # 4. Fetch road distance & duration matrix
    dist_matrix, dur_matrix = await osrm_service.get_distance_matrix(all_coords)

    # 5. Solve VRP with OR-Tools
    solver = VRPSolver(
        depot_coord=warehouse_coord,
        deliveries=deliveries,
        vehicles=vehicles,
        distance_matrix=dist_matrix,
        duration_matrix=dur_matrix,
        mode=req.mode
    )
    vrp_result = solver.solve()

    if vrp_result.get("status") == "INFEASIBLE":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=vrp_result.get("error", "No feasible route found.")
        )

    # 6. Generate OSRM road geometries for each vehicle route
    routes_with_geometry = []
    geojson_features = []

    for route in vrp_result.get("routes", []):
        stop_coords = [(s["lat"], s["lng"]) for s in route["stops"]]
        geo_data = await osrm_service.get_route_geometry(stop_coords)
        route["geometry"] = geo_data.get("coordinates", [])
        routes_with_geometry.append(route)

        geojson_features.append({
            "type": "Feature",
            "properties": {
                "vehicle_id": route["vehicle_id"],
                "registration_number": route["registration_number"],
                "distance_km": route["distance_km"],
                "duration_min": route["duration_min"],
                "total_load": route["total_load"],
            },
            "geometry": {
                "type": "LineString",
                "coordinates": geo_data.get("coordinates", [])
            }
        })

    # 7. Save route plan in Supabase
    plan_id = str(uuid.uuid4())
    plan_name = f"Route Plan - {req.mode.capitalize()} ({len(deliveries)} orders)"
    
    plan_data = {
        "id": plan_id,
        "name": plan_name,
        "status": "draft",
        "total_distance_km": vrp_result.get("total_distance_km", 0),
        "total_duration_min": vrp_result.get("total_duration_min", 0),
        "vehicle_count": len([r for r in routes_with_geometry if r["stop_count"] > 0]),
        "delivery_count": vrp_result.get("total_deliveries", 0),
        "optimization_mode": req.mode,
        "route_geometry_geojson": {"type": "FeatureCollection", "features": geojson_features},
        "created_by": user.id if hasattr(user, "id") else None,
    }

    try:
        supabase.table("route_plans").insert(plan_data).execute()

        # Save route stops
        stops_to_insert = []
        for route in routes_with_geometry:
            for s in route["stops"]:
                stops_to_insert.append({
                    "route_plan_id": plan_id,
                    "vehicle_id": route["vehicle_id"],
                    "delivery_id": s["delivery_id"],
                    "stop_sequence": s["stop_sequence"],
                    "lat": s["lat"],
                    "lng": s["lng"],
                    "is_warehouse": s["is_warehouse"],
                })

        if stops_to_insert:
            supabase.table("route_stops").insert(stops_to_insert).execute()
    except Exception as e:
        logger.error(f"Error persisting route plan to Supabase: {e}")

    return {
        "plan_id": plan_id,
        "name": plan_name,
        "status": "draft",
        "optimization_mode": req.mode,
        "total_distance_km": vrp_result.get("total_distance_km", 0),
        "total_duration_min": vrp_result.get("total_duration_min", 0),
        "vehicles_used": len([r for r in routes_with_geometry if r["stop_count"] > 0]),
        "total_deliveries": vrp_result.get("total_deliveries", 0),
        "unassigned_deliveries": vrp_result.get("unassigned", []),
        "routes": routes_with_geometry,
        "warehouse": {
            "name": settings.WAREHOUSE_NAME,
            "lat": warehouse_coord[0],
            "lng": warehouse_coord[1],
        }
    }

@router.get("/plans")
async def list_route_plans(user=Depends(require_admin)):
    supabase = get_supabase()
    res = supabase.table("route_plans").select("*").order("created_at", desc=True).limit(20).execute()
    return {"data": res.data or [], "total": len(res.data or [])}

@router.get("/plans/{plan_id}")
async def get_route_plan(plan_id: str, user=Depends(require_admin)):
    supabase = get_supabase()
    plan_res = supabase.table("route_plans").select("*").eq("id", plan_id).single().execute()
    if not plan_res.data:
        raise HTTPException(status_code=404, detail="Route plan not found")
    
    stops_res = supabase.table("route_stops").select("*, deliveries(*)").eq("route_plan_id", plan_id).order("stop_sequence").execute()
    return {"plan": plan_res.data, "stops": stops_res.data or []}

@router.post("/plans/{plan_id}/activate")
async def activate_route_plan(plan_id: str, user=Depends(require_admin)):
    """
    Activates a draft route plan and updates delivery assignments and vehicle statuses.
    """
    supabase = get_supabase()
    # Update plan status
    supabase.table("route_plans").update({"status": "active"}).eq("id", plan_id).execute()
    
    # Mark earlier active plans as completed
    supabase.table("route_plans").update({"status": "completed"}).neq("id", plan_id).eq("status", "active").execute()

    # Get stops to assign vehicles and drivers to deliveries
    stops_res = supabase.table("route_stops").select("delivery_id, vehicle_id").eq("route_plan_id", plan_id).not_.is_("delivery_id", "null").execute()
    
    for stop in (stops_res.data or []):
        if stop.get("delivery_id"):
            supabase.table("deliveries").update({
                "assigned_vehicle_id": stop["vehicle_id"],
                "status": "assigned"
            }).eq("id", stop["delivery_id"]).execute()

    return {"message": "Route plan activated successfully", "plan_id": plan_id}

@router.post("/plans/{plan_id}/discard")
async def discard_route_plan(plan_id: str, user=Depends(require_admin)):
    supabase = get_supabase()
    supabase.table("route_plans").update({"status": "discarded"}).eq("id", plan_id).execute()
    return {"message": "Route plan discarded", "plan_id": plan_id}
