export type UserRole = 'admin' | 'driver';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export type VehicleStatus = 'available' | 'on_delivery' | 'maintenance' | 'out_of_service';
export type VehicleType = 'van' | 'truck' | 'motorcycle' | 'car';
export type FuelType = 'petrol' | 'diesel' | 'electric' | 'hybrid';

export interface Vehicle {
  id: string;
  registration_number: string;
  vehicle_type: VehicleType;
  max_capacity: number;
  fuel_type: FuelType | string;
  status: VehicleStatus;
  assigned_driver_id?: string;
  assigned_driver?: Driver;
  current_lat?: number;
  current_lng?: number;
  created_at: string;
  updated_at: string;
}

export type DriverStatus = 'available' | 'on_duty' | 'off_duty';

export interface Driver {
  id: string;
  profile_id: string;
  full_name: string;
  email: string;
  phone: string;
  license_number: string;
  status: DriverStatus;
  assigned_vehicle_id?: string;
  assigned_vehicle?: Vehicle;
  created_at: string;
  updated_at: string;
}

export type DeliveryPriority = 'low' | 'normal' | 'high' | 'urgent';
export type DeliveryStatus =
  | 'pending'
  | 'assigned'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export interface Delivery {
  id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  lat: number;
  lng: number;
  package_weight: number;
  priority: DeliveryPriority;
  time_window_start?: string;
  time_window_end?: string;
  assigned_vehicle_id?: string;
  assigned_driver_id?: string;
  status: DeliveryStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RoutePlan {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'completed' | 'discarded';
  total_distance_km: number;
  total_duration_min: number;
  vehicle_count: number;
  delivery_count: number;
  optimization_mode: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RouteStop {
  id: string;
  route_plan_id: string;
  vehicle_id: string;
  delivery_id?: string;
  stop_sequence: number;
  lat: number;
  lng: number;
  estimated_arrival?: string;
  is_warehouse: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  is_read: boolean;
  created_at: string;
}

export interface Incident {
  id: string;
  vehicle_id?: string;
  driver_id?: string;
  incident_type: 'breakdown' | 'delay' | 'road_closure' | 'other';
  description: string;
  status: 'reported' | 'acknowledged' | 'resolved';
  lat?: number;
  lng?: number;
  reported_by?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_vehicles: number;
  active_vehicles: number;
  total_drivers: number;
  pending_deliveries: number;
  completed_deliveries: number;
  delayed_deliveries: number;
  total_distance_km: number;
  fleet_utilization: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

export type OptimizationMode =
  | 'distance'
  | 'time'
  | 'priority'
  | 'balanced';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ScenarioSimulation {
  id: string;
  name: string;
  scenario_type: 'breakdown' | 'road_closure' | 'urgent_delivery' | 'capacity_change';
  original_plan?: RoutePlan;
  proposed_plan?: RoutePlan;
  impact: {
    delta_distance_km: number;
    delta_duration_min: number;
    affected_deliveries: number;
    vehicles_used: number;
  };
  status: 'pending' | 'approved' | 'discarded';
  created_at: string;
}
