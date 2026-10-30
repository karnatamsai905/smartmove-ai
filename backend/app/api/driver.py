import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.core.security import require_driver
from app.database.supabase_client import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter()

# Valid delivery state machine transitions
ALLOWED_TRANSITIONS = {
    "pending": ["assigned", "cancelled"],
    "assigned": ["picked_up", "cancelled"],
    "picked_up": ["in_transit", "failed", "cancelled"],
    "in_transit": ["delivered", "failed", "cancelled"],
    "delivered": [],
    "failed": ["pending", "assigned"],
    "cancelled": []
}

class StatusUpdateRequest(BaseModel):
    new_status: str
    notes: Optional[str] = None

class IncidentReportRequest(BaseModel):
    incident_type: str  # 'breakdown', 'delay', 'road_closure', 'other'
    description: str
    lat: Optional[float] = None
    lng: Optional[float] = None

@router.get("/dashboard")
async def get_driver_dashboard(user=Depends(require_driver)):
    """
    Returns authenticated driver's assigned vehicle, active stops, and today's deliveries.
    """
    supabase = get_supabase()

    # Find driver profile
    d_res = supabase.table("drivers").select("*, vehicles(*)").eq("profile_id", user.id).execute()
    driver_data = d_res.data[0] if d_res.data else None

    if not driver_data:
        # Fallback: find by driver ID if user is an admin or testing
        d_res = supabase.table("drivers").select("*, vehicles(*)").limit(1).execute()
        driver_data = d_res.data[0] if d_res.data else None

    if not driver_data:
        return {
            "driver": None,
            "vehicle": None,
            "deliveries": [],
            "route_plan": None
        }

    driver_id = driver_data["id"]
    vehicle_id = driver_data.get("assigned_vehicle_id")

    # Fetch assigned deliveries
    deliv_res = supabase.table("deliveries").select("*").eq("assigned_driver_id", driver_id).order("created_at").execute()
    deliveries = deliv_res.data or []

    # If no deliveries assigned by driver_id, check by vehicle_id
    if not deliveries and vehicle_id:
        deliv_res = supabase.table("deliveries").select("*").eq("assigned_vehicle_id", vehicle_id).order("created_at").execute()
        deliveries = deliv_res.data or []

    # Check for active route plan stops
    active_stops = []
    if vehicle_id:
        stops_res = supabase.table("route_stops").select("*").eq("vehicle_id", vehicle_id).order("stop_sequence").execute()
        active_stops = stops_res.data or []

    return {
        "driver": driver_data,
        "vehicle": driver_data.get("vehicles"),
        "deliveries": deliveries,
        "stops": active_stops
    }

@router.post("/deliveries/{delivery_id}/status")
async def update_delivery_status(delivery_id: str, req: StatusUpdateRequest, user=Depends(require_driver)):
    """
    Validates state machine transitions and logs update to delivery_status_history.
    """
    supabase = get_supabase()

    # Fetch current delivery status
    d_res = supabase.table("deliveries").select("id, status").eq("id", delivery_id).single().execute()
    if not d_res.data:
        raise HTTPException(status_code=404, detail="Delivery order not found")

    current_status = d_res.data.get("status", "pending")
    allowed = ALLOWED_TRANSITIONS.get(current_status, [])

    if req.new_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status transition from '{current_status}' to '{req.new_status}'. Allowed transitions: {allowed}"
        )

    # Update delivery
    supabase.table("deliveries").update({"status": req.new_status}).eq("id", delivery_id).execute()

    # Log to delivery_status_history audit trail
    supabase.table("delivery_status_history").insert({
        "delivery_id": delivery_id,
        "old_status": current_status,
        "new_status": req.new_status,
        "changed_by": user.id if hasattr(user, "id") else None,
        "notes": req.notes,
    }).execute()

    return {
        "message": f"Delivery status updated to {req.new_status}",
        "delivery_id": delivery_id,
        "previous_status": current_status,
        "new_status": req.new_status
    }

@router.post("/incidents")
async def report_incident(req: IncidentReportRequest, user=Depends(require_driver)):
    """
    Allows driver to report roadside breakdowns, traffic delays, or route obstacles.
    """
    supabase = get_supabase()

    d_res = supabase.table("drivers").select("id, assigned_vehicle_id").eq("profile_id", user.id).execute()
    driver_data = d_res.data[0] if d_res.data else {}

    incident_data = {
        "driver_id": driver_data.get("id"),
        "vehicle_id": driver_data.get("assigned_vehicle_id"),
        "incident_type": req.incident_type,
        "description": req.description,
        "status": "reported",
        "lat": req.lat,
        "lng": req.lng,
        "reported_by": user.id if hasattr(user, "id") else None,
    }

    res = supabase.table("incidents").insert(incident_data).execute()

    # If breakdown, set vehicle status to out_of_service
    if req.incident_type == "breakdown" and driver_data.get("assigned_vehicle_id"):
        supabase.table("vehicles").update({"status": "out_of_service"}).eq("id", driver_data["assigned_vehicle_id"]).execute()

    return {"message": "Incident reported successfully to dispatch.", "data": res.data}
