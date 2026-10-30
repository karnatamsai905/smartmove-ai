-- Enable extensions
create extension if not exists "uuid-ossp";

-- Drop existing tables if re-running
drop table if exists public.notifications cascade;
drop table if exists public.optimization_runs cascade;
drop table if exists public.incidents cascade;
drop table if exists public.delivery_status_history cascade;
drop table if exists public.route_stops cascade;
drop table if exists public.route_plans cascade;
drop table if exists public.deliveries cascade;
drop table if exists public.drivers cascade;
drop table if exists public.vehicles cascade;
drop table if exists public.profiles cascade;

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text not null,
  role text not null check (role in ('admin', 'driver')),
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Vehicles table
create table public.vehicles (
  id uuid default uuid_generate_v4() primary key,
  registration_number text not null unique,
  vehicle_type text not null check (vehicle_type in ('van', 'truck', 'motorcycle', 'car')),
  max_capacity numeric not null check (max_capacity > 0),
  fuel_type text not null default 'petrol',
  status text not null default 'available' check (status in ('available', 'on_delivery', 'maintenance', 'out_of_service')),
  assigned_driver_id uuid,
  current_lat numeric,
  current_lng numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Drivers table
create table public.drivers (
  id uuid default uuid_generate_v4() primary key,
  profile_id uuid references public.profiles(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text not null,
  license_number text not null unique,
  status text not null default 'available' check (status in ('available', 'on_duty', 'off_duty')),
  assigned_vehicle_id uuid references public.vehicles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add foreign key back to vehicles for assigned_driver_id
alter table public.vehicles 
  add constraint fk_vehicles_driver 
  foreign key (assigned_driver_id) 
  references public.drivers(id) on delete set null;

-- Deliveries table
create table public.deliveries (
  id uuid default uuid_generate_v4() primary key,
  customer_name text not null,
  customer_phone text not null,
  delivery_address text not null,
  lat numeric not null,
  lng numeric not null,
  package_weight numeric not null check (package_weight > 0),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  time_window_start text,
  time_window_end text,
  assigned_vehicle_id uuid references public.vehicles(id) on delete set null,
  assigned_driver_id uuid references public.drivers(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed', 'cancelled')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Route Plans table
create table public.route_plans (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'discarded')),
  total_distance_km numeric default 0,
  total_duration_min numeric default 0,
  vehicle_count integer default 0,
  delivery_count integer default 0,
  optimization_mode text not null default 'balanced',
  route_geometry_geojson jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Route Stops table
create table public.route_stops (
  id uuid default uuid_generate_v4() primary key,
  route_plan_id uuid references public.route_plans(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  delivery_id uuid references public.deliveries(id) on delete set null,
  stop_sequence integer not null,
  lat numeric not null,
  lng numeric not null,
  estimated_arrival timestamptz,
  is_warehouse boolean default false,
  created_at timestamptz default now()
);

-- Delivery Status History table (Audit log)
create table public.delivery_status_history (
  id uuid default uuid_generate_v4() primary key,
  delivery_id uuid references public.deliveries(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz default now()
);

-- Incidents table
create table public.incidents (
  id uuid default uuid_generate_v4() primary key,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  driver_id uuid references public.drivers(id) on delete set null,
  incident_type text not null check (incident_type in ('breakdown', 'delay', 'road_closure', 'other')),
  description text not null,
  status text not null default 'reported' check (status in ('reported', 'acknowledged', 'resolved')),
  lat numeric,
  lng numeric,
  reported_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Optimization Runs table
create table public.optimization_runs (
  id uuid default uuid_generate_v4() primary key,
  route_plan_id uuid references public.route_plans(id) on delete cascade,
  mode text not null,
  vehicle_count integer,
  delivery_count integer,
  solver_status text,
  solve_time_ms integer,
  created_at timestamptz default now()
);

-- Notifications table
create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info' check (type in ('info', 'warning', 'error', 'success')),
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Indexes for performance
create index idx_vehicles_status on public.vehicles(status);
create index idx_drivers_status on public.drivers(status);
create index idx_drivers_profile on public.drivers(profile_id);
create index idx_deliveries_status on public.deliveries(status);
create index idx_deliveries_priority on public.deliveries(priority);
create index idx_deliveries_vehicle on public.deliveries(assigned_vehicle_id);
create index idx_deliveries_driver on public.deliveries(assigned_driver_id);
create index idx_route_stops_plan on public.route_stops(route_plan_id);
create index idx_route_stops_vehicle on public.route_stops(vehicle_id);
create index idx_status_history_delivery on public.delivery_status_history(delivery_id);
create index idx_notifications_user on public.notifications(user_id, is_read);

-- Automatic updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tr_profiles_updated_at before update on public.profiles for each row execute function public.handle_updated_at();
create trigger tr_vehicles_updated_at before update on public.vehicles for each row execute function public.handle_updated_at();
create trigger tr_drivers_updated_at before update on public.drivers for each row execute function public.handle_updated_at();
create trigger tr_deliveries_updated_at before update on public.deliveries for each row execute function public.handle_updated_at();
create trigger tr_route_plans_updated_at before update on public.route_plans for each row execute function public.handle_updated_at();
create trigger tr_incidents_updated_at before update on public.incidents for each row execute function public.handle_updated_at();

-- Auto create profile on auth signup trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'admin')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users (if accessible)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.drivers enable row level security;
alter table public.deliveries enable row level security;
alter table public.route_plans enable row level security;
alter table public.route_stops enable row level security;
alter table public.delivery_status_history enable row level security;
alter table public.incidents enable row level security;
alter table public.optimization_runs enable row level security;
alter table public.notifications enable row level security;

-- Row Level Security Policies
-- Helper function with SECURITY DEFINER to check admin role without RLS recursion
create or replace function public.is_admin()
returns boolean as $$
declare
  user_role text;
begin
  select role into user_role from public.profiles where id = auth.uid();
  return user_role = 'admin';
end;
$$ language plpgsql security definer set search_path = public;

-- Profiles: Authenticated users can read profiles, users update own
create policy "Authenticated read profiles" on public.profiles for select using (auth.role() = 'authenticated');
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Insert profile" on public.profiles for insert with check (auth.uid() = id or auth.role() = 'service_role');

-- Vehicles: Admins full access, authenticated drivers can view
create policy "Admins manage vehicles" on public.vehicles for all using (
  public.is_admin() or auth.role() = 'service_role'
);
create policy "Authenticated read vehicles" on public.vehicles for select using (auth.role() = 'authenticated');

-- Drivers: Admins manage drivers, authenticated read
create policy "Admins manage drivers" on public.drivers for all using (
  public.is_admin() or auth.role() = 'service_role'
);
create policy "Authenticated read drivers" on public.drivers for select using (auth.role() = 'authenticated');

-- Deliveries: Admins full access, Drivers can read their assigned deliveries & update status
create policy "Admins manage deliveries" on public.deliveries for all using (
  public.is_admin() or auth.role() = 'service_role'
);
create policy "Drivers read assigned deliveries" on public.deliveries for select using (
  assigned_driver_id in (select id from public.drivers where profile_id = auth.uid())
);
create policy "Drivers update assigned deliveries" on public.deliveries for update using (
  assigned_driver_id in (select id from public.drivers where profile_id = auth.uid())
);

-- Route plans & stops: Admins manage, authenticated read
create policy "Admins manage route plans" on public.route_plans for all using (
  public.is_admin() or auth.role() = 'service_role'
);
create policy "Authenticated read route plans" on public.route_plans for select using (auth.role() = 'authenticated');

create policy "Admins manage route stops" on public.route_stops for all using (
  public.is_admin() or auth.role() = 'service_role'
);
create policy "Authenticated read route stops" on public.route_stops for select using (auth.role() = 'authenticated');

-- Delivery status history
create policy "Admins manage status history" on public.delivery_status_history for all using (
  public.is_admin() or auth.role() = 'service_role'
);
create policy "Drivers insert status history" on public.delivery_status_history for insert with check (auth.role() = 'authenticated');
create policy "Drivers read own delivery status history" on public.delivery_status_history for select using (
  delivery_id in (select id from public.deliveries where assigned_driver_id in (select id from public.drivers where profile_id = auth.uid()))
);

-- Incidents: Admins manage all, drivers insert and read own
create policy "Admins manage incidents" on public.incidents for all using (
  public.is_admin() or auth.role() = 'service_role'
);
create policy "Drivers report incidents" on public.incidents for insert with check (auth.role() = 'authenticated');
create policy "Drivers read own reported incidents" on public.incidents for select using (
  reported_by = auth.uid() or driver_id in (select id from public.drivers where profile_id = auth.uid())
);

-- Optimization runs
create policy "Admins manage optimization runs" on public.optimization_runs for all using (
  public.is_admin() or auth.role() = 'service_role'
);
create policy "Authenticated read optimization runs" on public.optimization_runs for select using (auth.role() = 'authenticated');

-- Notifications
create policy "Users read own notifications" on public.notifications for select using (user_id = auth.uid());
create policy "Users update own notifications" on public.notifications for update using (user_id = auth.uid());
create policy "Admins insert notifications" on public.notifications for insert with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or auth.role() = 'service_role'
);

