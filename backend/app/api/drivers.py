import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import require_admin
from app.database.supabase_client import get_supabase
from app.schemas.drivers import DriverCreate, DriverUpdate

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/")
async def list_drivers(
    status_filter: Optional[str] = None,
    user=Depends(require_admin)
):
    supabase = get_supabase()
    query = supabase.table("drivers").select("*, vehicles(registration_number, vehicle_type, status)")
    if status_filter:
        query = query.eq("status", status_filter)
    res = query.order("created_at", desc=True).execute()
    return {"data": res.data or [], "total": len(res.data or [])}

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_driver(driver: DriverCreate, user=Depends(require_admin)):
    supabase = get_supabase()
    # Check license number uniqueness
    existing = supabase.table("drivers").select("id").eq("license_number", driver.license_number).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="A driver with this license number already exists.")

    res = supabase.table("drivers").insert(driver.model_dump()).execute()
    return {"message": "Driver added successfully", "data": res.data[0] if res.data else None}

@router.get("/{driver_id}")
async def get_driver(driver_id: str, user=Depends(require_admin)):
    supabase = get_supabase()
    res = supabase.table("drivers").select("*, vehicles(*)").eq("id", driver_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Driver not found")
    return res.data

@router.patch("/{driver_id}")
async def update_driver(driver_id: str, payload: DriverUpdate, user=Depends(require_admin)):
    supabase = get_supabase()
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update.")

    # Prevent vehicle conflict: check if the target vehicle is already assigned to another driver
    new_vehicle_id = update_data.get("assigned_vehicle_id")
    if new_vehicle_id:
        existing = supabase.table("drivers").select("id, full_name").eq("assigned_vehicle_id", new_vehicle_id).neq("id", driver_id).execute()
        if existing.data:
            other_name = existing.data[0].get("full_name", "another driver")
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Vehicle is already assigned to driver {other_name}."
            )

    res = supabase.table("drivers").update(update_data).eq("id", driver_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Driver not found")
    return {"message": "Driver updated successfully", "data": res.data[0]}

@router.delete("/{driver_id}")
async def delete_driver(driver_id: str, user=Depends(require_admin)):
    supabase = get_supabase()
    # Unlink assigned vehicle before deletion
    supabase.table("vehicles").update({"assigned_driver_id": None}).eq("assigned_driver_id", driver_id).execute()
    res = supabase.table("drivers").delete().eq("id", driver_id).execute()
    return {"message": "Driver deleted successfully", "id": driver_id}
