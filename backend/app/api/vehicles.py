import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.core.security import require_admin
from app.database.supabase_client import get_supabase
from app.schemas.vehicles import VehicleCreate, VehicleUpdate

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/")
async def list_vehicles(
    status_filter: Optional[str] = None,
    user=Depends(require_admin)
):
    supabase = get_supabase()
    query = supabase.table("vehicles").select("*, drivers(full_name, phone, license_number)")
    if status_filter:
        query = query.eq("status", status_filter)
    res = query.order("created_at", desc=True).execute()
    return {"data": res.data or [], "total": len(res.data or [])}

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_vehicle(vehicle: VehicleCreate, user=Depends(require_admin)):
    supabase = get_supabase()
    # Check registration uniqueness
    existing = supabase.table("vehicles").select("id").eq("registration_number", vehicle.registration_number).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="A vehicle with this registration number already exists.")

    res = supabase.table("vehicles").insert(vehicle.model_dump()).execute()
    return {"message": "Vehicle added successfully", "data": res.data[0] if res.data else None}

@router.get("/{vehicle_id}")
async def get_vehicle(vehicle_id: str, user=Depends(require_admin)):
    supabase = get_supabase()
    res = supabase.table("vehicles").select("*, drivers(*)").eq("id", vehicle_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return res.data

@router.patch("/{vehicle_id}")
async def update_vehicle(vehicle_id: str, payload: VehicleUpdate, user=Depends(require_admin)):
    supabase = get_supabase()
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update.")

    res = supabase.table("vehicles").update(update_data).eq("id", vehicle_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return {"message": "Vehicle updated successfully", "data": res.data[0]}

@router.delete("/{vehicle_id}")
async def delete_vehicle(vehicle_id: str, user=Depends(require_admin)):
    supabase = get_supabase()
    # Check if vehicle has active deliveries
    active_deliveries = supabase.table("deliveries").select("id").eq("assigned_vehicle_id", vehicle_id).in_("status", ["in_transit", "picked_up"]).execute()
    if active_deliveries.data:
        raise HTTPException(status_code=400, detail="Cannot delete a vehicle that is currently assigned to active deliveries in transit.")

    res = supabase.table("vehicles").delete().eq("id", vehicle_id).execute()
    return {"message": "Vehicle deleted successfully", "id": vehicle_id}
