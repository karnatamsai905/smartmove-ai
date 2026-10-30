import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import require_admin
from app.database.supabase_client import get_supabase
from app.schemas.deliveries import DeliveryCreate, DeliveryUpdate
from app.services.nominatim import nominatim_service

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/")
async def list_deliveries(
    status_filter: Optional[str] = None,
    priority_filter: Optional[str] = None,
    user=Depends(require_admin)
):
    supabase = get_supabase()
    query = supabase.table("deliveries").select("*, vehicles(registration_number), drivers(full_name)")
    if status_filter:
        query = query.eq("status", status_filter)
    if priority_filter:
        query = query.eq("priority", priority_filter)
    res = query.order("created_at", desc=True).execute()
    return {"data": res.data or [], "total": len(res.data or [])}

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_delivery(delivery: DeliveryCreate, user=Depends(require_admin)):
    supabase = get_supabase()
    deliv_dict = delivery.model_dump()

    # If coordinates are at default or not provided, attempt geocoding
    if deliv_dict.get("lat") == 0.0 or deliv_dict.get("lng") == 0.0:
        geo = await nominatim_service.geocode(deliv_dict["delivery_address"])
        if geo:
            deliv_dict["lat"] = geo[0]
            deliv_dict["lng"] = geo[1]

    # Validate coordinates are valid floats
    if not (1.0 <= deliv_dict.get("lat", 0) <= 90.0 and 1.0 <= deliv_dict.get("lng", 0) <= 180.0):
        # Default to Chennai Central coordinates if geocoding completely fails
        deliv_dict["lat"] = 13.0827
        deliv_dict["lng"] = 80.2707

    res = supabase.table("deliveries").insert(deliv_dict).execute()
    return {"message": "Delivery created successfully", "data": res.data[0] if res.data else None}

@router.get("/{delivery_id}")
async def get_delivery(delivery_id: str, user=Depends(require_admin)):
    supabase = get_supabase()
    res = supabase.table("deliveries").select("*, vehicles(*), drivers(*)").eq("id", delivery_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return res.data

@router.patch("/{delivery_id}")
async def update_delivery(delivery_id: str, payload: DeliveryUpdate, user=Depends(require_admin)):
    supabase = get_supabase()
    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update.")

    # Vehicle capacity check if assigning a vehicle
    assigned_v = update_data.get("assigned_vehicle_id")
    if assigned_v:
        # Check vehicle capacity
        v_res = supabase.table("vehicles").select("max_capacity, status").eq("id", assigned_v).single().execute()
        if not v_res.data:
            raise HTTPException(status_code=404, detail="Assigned vehicle not found.")
        if v_res.data.get("status") in ["maintenance", "out_of_service"]:
            raise HTTPException(status_code=400, detail="Cannot assign deliveries to an unavailable vehicle.")

        # Check existing payload load
        cur_d = supabase.table("deliveries").select("package_weight").eq("id", delivery_id).single().execute()
        pkg_weight = update_data.get("package_weight") or (cur_d.data.get("package_weight", 0) if cur_d.data else 0)

        active_loads = supabase.table("deliveries").select("package_weight").eq("assigned_vehicle_id", assigned_v).in_("status", ["assigned", "picked_up", "in_transit"]).neq("id", delivery_id).execute()
        total_assigned_load = sum(float(d.get("package_weight", 0)) for d in (active_loads.data or []))

        if total_assigned_load + float(pkg_weight) > float(v_res.data.get("max_capacity", 500)):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vehicle capacity exceeded! Vehicle max capacity: {v_res.data.get('max_capacity')} kg, current load: {total_assigned_load} kg, package: {pkg_weight} kg."
            )

    res = supabase.table("deliveries").update(update_data).eq("id", delivery_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return {"message": "Delivery updated successfully", "data": res.data[0]}

@router.delete("/{delivery_id}")
async def delete_delivery(delivery_id: str, user=Depends(require_admin)):
    supabase = get_supabase()
    res = supabase.table("deliveries").delete().eq("id", delivery_id).execute()
    return {"message": "Delivery deleted successfully", "id": delivery_id}
