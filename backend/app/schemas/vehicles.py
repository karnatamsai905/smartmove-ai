from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime
from enum import Enum


class VehicleStatus(str, Enum):
    available = "available"
    on_delivery = "on_delivery"
    maintenance = "maintenance"
    out_of_service = "out_of_service"


class VehicleType(str, Enum):
    van = "van"
    truck = "truck"
    motorcycle = "motorcycle"
    car = "car"


class VehicleBase(BaseModel):
    registration_number: str
    vehicle_type: VehicleType
    max_capacity: float
    fuel_type: str = "petrol"
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    status: VehicleStatus = VehicleStatus.available


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(BaseModel):
    registration_number: Optional[str] = None
    vehicle_type: Optional[VehicleType] = None
    max_capacity: Optional[float] = None
    fuel_type: Optional[str] = None
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    status: Optional[VehicleStatus] = None
    assigned_driver_id: Optional[str] = None


class Vehicle(VehicleBase):
    id: str
    assigned_driver_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
