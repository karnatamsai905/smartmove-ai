from pydantic import BaseModel
from typing import Optional
from datetime import datetime, time
from enum import Enum


class DeliveryPriority(str, Enum):
    low = "low"
    normal = "normal"
    high = "high"
    urgent = "urgent"


class DeliveryStatus(str, Enum):
    pending = "pending"
    assigned = "assigned"
    picked_up = "picked_up"
    in_transit = "in_transit"
    delivered = "delivered"
    failed = "failed"
    cancelled = "cancelled"


class DeliveryBase(BaseModel):
    customer_name: str
    customer_phone: str
    delivery_address: str
    lat: float
    lng: float
    package_weight: float
    priority: DeliveryPriority = DeliveryPriority.normal
    time_window_start: Optional[str] = None
    time_window_end: Optional[str] = None
    notes: Optional[str] = None


class DeliveryCreate(DeliveryBase):
    pass


class DeliveryUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    delivery_address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    package_weight: Optional[float] = None
    priority: Optional[DeliveryPriority] = None
    time_window_start: Optional[str] = None
    time_window_end: Optional[str] = None
    assigned_vehicle_id: Optional[str] = None
    assigned_driver_id: Optional[str] = None
    status: Optional[DeliveryStatus] = None
    notes: Optional[str] = None


class Delivery(DeliveryBase):
    id: str
    assigned_vehicle_id: Optional[str] = None
    assigned_driver_id: Optional[str] = None
    status: DeliveryStatus = DeliveryStatus.pending
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
