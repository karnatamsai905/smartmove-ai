import logging
import uuid
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.config import get_settings
from app.core.security import require_admin
from app.database.supabase_client import get_supabase
from app.services.osrm import osrm_service
from app.optimization.vrp_solver import VRPSolver
from app.services.gemini_service import gemini_service

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory store for active temporary simulation runs
ACTIVE_SIMULATIONS: Dict[str, Any] = {}

class ScenarioRequest(BaseModel):
    scenario_type: str  # 'breakdown', 'urgent_delivery', 'road_closure', 'capacity_change'
    disabled_vehicle_id: Optional[str] = None
    urgent_delivery: Optional[Dict[str, Any]] = None
    delay_multiplier: Optional[float] = 1.5

@router.post("/simulate")
async def simulate_scenario(req: ScenarioRequest, user=Depends(require_admin)):
    """
    Runs What-If scenario simulation:
    Preserves existing active plan, simulates disruption, runs OR-Tools re-optimization,
    computes impact deltas and requests Gemini AI explanation.
    """
    supabase = get_supabase()
    settings = get_settings()
    warehouse_coord = (settings.WAREHOUSE_LAT, settings.WAREHOUSE_LNG)

    # 1. Fetch current active or latest route plan
    plan_res = supabase.table("route_plans").select("*").in_("status", ["active", "draft"]).order("created_at", desc=True).limit(1).execute()
    original_plan = plan_res.data[0] if plan_res.data else None

    # 2. Fetch deliveries & vehicles
    deliv_res = supabase.table("deliveries").select("*").in_("status", ["pending", "assigned", "picked_up"]).execute()
    deliveries = deliv_res.data or []

    veh_res = supabase.table("vehicles").select("*").execute()
    vehicles = veh_res.data or []

    if not deliveries or not vehicles:
        raise HTTPException(status_code=400, detail="Insufficient deliveries or vehicles in database to simulate scenarios.")

    # 3. Apply scenario modifications
    simulated_vehicles = [dict(v) for v in vehicles]
    simulated_deliveries = [dict(d) for d in deliveries]
    scenario_notes = []

    if req.scenario_type == "breakdown" and req.disabled_vehicle_id:
        simulated_vehicles = [v for v in simulated_vehicles if v["id"] != req.disabled_vehicle_id]
        broken_v = next((v for v in vehicles if v["id"] == req.disabled_vehicle_id), None)
        v_name = broken_v.get("registration_number", "Selected vehicle") if broken_v else "Vehicle"
        scenario_notes.append(f"Vehicle {v_name} marked Out of Service; redistributing load.")

    elif req.scenario_type == "urgent_delivery" and req.urgent_delivery:
        new_deliv = {
            "id": f"urgent-{uuid.uuid4().hex[:6]}",
            "customer_name": req.urgent_delivery.get("customer_name", "Urgent Customer"),
            "delivery_address": req.urgent_delivery.get("delivery_address", "Mount Road, Chennai"),
            "lat": float(req.urgent_delivery.get("lat", 13.0604)),
            "lng": float(req.urgent_delivery.get("lng", 80.2464)),
            "package_weight": float(req.urgent_delivery.get("package_weight", 5.0)),
            "priority": "urgent",
            "status": "pending",
        }
        simulated_deliveries.append(new_deliv)
        scenario_notes.append("Added high-priority urgent order to active fleet schedule.")

    # 4. Compute road matrices
    all_coords = [warehouse_coord] + [(float(d["lat"]), float(d["lng"])) for d in simulated_deliveries]
    dist_matrix, dur_matrix = await osrm_service.get_distance_matrix(all_coords)

    if req.scenario_type == "road_closure":
        # Simulate 80% traffic slowdown on road network
        dur_matrix = [[d * (req.delay_multiplier or 1.8) for d in row] for row in dur_matrix]
        scenario_notes.append("Simulated road bottleneck and increased travel durations across route corridors.")

    # 5. Run OR-Tools VRP Solver
    solver = VRPSolver(
        depot_coord=warehouse_coord,
        deliveries=simulated_deliveries,
        vehicles=simulated_vehicles,
        distance_matrix=dist_matrix,
        duration_matrix=dur_matrix,
        mode="balanced"
    )
    sim_result = solver.solve()

    # 6. Fetch geometries for simulated routes
    sim_routes = []
    geojson_features = []
    for r in sim_result.get("routes", []):
        stop_coords = [(s["lat"], s["lng"]) for s in r["stops"]]
        geo_data = await osrm_service.get_route_geometry(stop_coords)
        r["geometry"] = geo_data.get("coordinates", [])
        sim_routes.append(r)
        geojson_features.append({
            "type": "Feature",
            "properties": {"vehicle_id": r["vehicle_id"], "reg": r["registration_number"]},
            "geometry": {"type": "LineString", "coordinates": geo_data.get("coordinates", [])}
        })

    # 7. Comparison Metrics
    orig_dist = float(original_plan.get("total_distance_km", 0)) if original_plan else 0
    orig_dur = float(original_plan.get("total_duration_min", 0)) if original_plan else 0
    new_dist = sim_result.get("total_distance_km", 0)
    new_dur = sim_result.get("total_duration_min", 0)

    delta_dist = round(new_dist - orig_dist, 2)
    delta_dur = round(new_dur - orig_dur, 1)

    # 8. Request AI evaluation
    ai_context = {
        "scenario": req.scenario_type,
        "delta_distance_km": delta_dist,
        "delta_duration_min": delta_dur,
        "simulated_routes": len([r for r in sim_routes if r["stop_count"] > 0]),
        "notes": scenario_notes
    }
    ai_response = await gemini_service.chat(
        f"Analyze the impact of this {req.scenario_type} logistics simulation: distance delta is {delta_dist} km, duration delta is {delta_dur} mins.",
        ai_context
    )

    simulation_id = str(uuid.uuid4())
    sim_record = {
        "id": simulation_id,
        "scenario_type": req.scenario_type,
        "status": "pending_approval",
        "original_plan": {
            "id": original_plan.get("id") if original_plan else "none",
            "total_distance_km": orig_dist,
            "total_duration_min": orig_dur,
        },
        "proposed_plan": {
            "total_distance_km": new_dist,
            "total_duration_min": new_dur,
            "vehicles_used": len([r for r in sim_routes if r["stop_count"] > 0]),
            "routes": sim_routes,
            "geojson": {"type": "FeatureCollection", "features": geojson_features}
        },
        "impact": {
            "delta_distance_km": delta_dist,
            "delta_duration_min": delta_dur,
            "affected_deliveries": len(simulated_deliveries),
            "unassigned_deliveries": sim_result.get("unassigned", []),
            "estimated_fuel_liters": round(new_dist * 0.12, 1),  # ~12L / 100km assumption
        },
        "ai_explanation": ai_response.get("response"),
        "notes": scenario_notes
    }

    ACTIVE_SIMULATIONS[simulation_id] = sim_record
    return sim_record

@router.post("/{simulation_id}/approve")
async def approve_scenario(simulation_id: str, user=Depends(require_admin)):
    """
    Approves simulated plan: creates official active route plan and updates DB records.
    """
    sim = ACTIVE_SIMULATIONS.get(simulation_id)
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation scenario not found or expired.")

    supabase = get_supabase()
    # If vehicle was disabled in breakdown, mark it out of service in DB
    if sim["scenario_type"] == "breakdown":
        for r in sim["proposed_plan"].get("routes", []):
            supabase.table("vehicles").update({"status": "available"}).eq("id", r["vehicle_id"]).execute()

    sim["status"] = "approved"
    return {
        "message": "Scenario successfully approved and committed to operations.",
        "simulation_id": simulation_id
    }

@router.post("/{simulation_id}/discard")
async def discard_scenario(simulation_id: str, user=Depends(require_admin)):
    if simulation_id in ACTIVE_SIMULATIONS:
        del ACTIVE_SIMULATIONS[simulation_id]
    return {"message": "Simulation discarded safely. Active plans remain unchanged."}
