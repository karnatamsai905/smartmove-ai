from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class DriverStatus(str, Enum):
    available = "available"
    on_duty = "on_duty"
    off_duty = "off_duty"


class DriverBase(BaseModel):
    full_name: str
    email: str
    phone: str
    license_number: str
    status: DriverStatus = DriverStatus.available


class DriverCreate(DriverBase):
    profile_id: str


class DriverUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    license_number: Optional[str] = None
    status: Optional[DriverStatus] = None
    assigned_vehicle_id: Optional[str] = None


class Driver(DriverBase):
    id: str
    profile_id: str
    assigned_vehicle_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
