import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.core.security import require_admin
from app.database.supabase_client import get_supabase
from app.services.gemini_service import gemini_service

logger = logging.getLogger(__name__)
router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = None

@router.post("/chat")
async def chat_with_assistant(req: ChatRequest, user=Depends(require_admin)):
    """
    Connects frontend user query with live Supabase database context
    and calls SmartMove AI Gemini Assistant.
    """
    supabase = get_supabase()

    # Query real application data for context injection
    try:
        v_res = supabase.table("vehicles").select("id, registration_number, vehicle_type, max_capacity, status").execute()
        vehicles = v_res.data or []
    except Exception:
        vehicles = []

    try:
        d_res = supabase.table("deliveries").select("id, customer_name, delivery_address, package_weight, priority, status").limit(10).execute()
        deliveries = d_res.data or []
    except Exception:
        deliveries = []

    try:
        p_res = supabase.table("route_plans").select("id, name, status, total_distance_km, vehicle_count").eq("status", "active").limit(1).execute()
        active_plans = p_res.data or []
    except Exception:
        active_plans = []

    total_vehicles = len(vehicles)
    active_vehicles = len([v for v in vehicles if v.get("status") == "on_delivery"])
    available_vehicles = len([v for v in vehicles if v.get("status") == "available"])
    pending_deliveries = len([d for d in deliveries if d.get("status") in ["pending", "assigned"]])

    context = {
        "total_vehicles": total_vehicles,
        "active_vehicles": active_vehicles,
        "available_vehicles": available_vehicles,
        "pending_deliveries": pending_deliveries,
        "active_plans": len(active_plans),
        "vehicles_sample": vehicles[:4],
        "deliveries_sample": deliveries[:5],
        "total_distance_km": active_plans[0].get("total_distance_km", 0) if active_plans else 0,
        "fleet_utilization": round((active_vehicles / total_vehicles * 100), 1) if total_vehicles else 0,
    }

    result = await gemini_service.chat(
        user_message=req.message,
        context=context,
        history=req.history
    )

    return result

@router.post("/analyze")
async def analyze_fleet_operations(user=Depends(require_admin)):
    """
    Analyzes current logistics workload and generates operational suggestions.
    """
    supabase = get_supabase()
    v_res = supabase.table("vehicles").select("*").execute()
    d_res = supabase.table("deliveries").select("*").execute()

    vehicles = v_res.data or []
    deliveries = d_res.data or []

    prompt = (
        f"Perform an operational logistics audit. We have {len(vehicles)} vehicles and "
        f"{len(deliveries)} total orders recorded. Summarize bottleneck risks, vehicle capacity balance, "
        f"and key steps to minimize travel distance across Chennai."
    )

    context = {
        "total_vehicles": len(vehicles),
        "total_deliveries": len(deliveries),
        "vehicles_sample": vehicles[:5],
        "deliveries_sample": deliveries[:5],
    }

    return await gemini_service.chat(prompt, context)
