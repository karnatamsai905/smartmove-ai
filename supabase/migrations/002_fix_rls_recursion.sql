-- ============================================================
-- Fix: Remove Infinite Recursion in Profiles RLS Policies
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Create a Security Definer function to check admin role without RLS recursion
create or replace function public.is_admin()
returns boolean as $$
declare
  user_role text;
begin
  select role into user_role from public.profiles where id = auth.uid();
  return user_role = 'admin';
end;
$$ language plpgsql security definer set search_path = public;

-- 2. Drop the recursive policies on profiles
drop policy if exists "Admins read all profiles" on public.profiles;
drop policy if exists "Users read own profile" on public.profiles;
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Authenticated read profiles" on public.profiles;

-- 3. Add clean non-recursive SELECT policy for profiles
create policy "Authenticated read profiles"
  on public.profiles
  for select
  using (auth.role() = 'authenticated');

-- 4. Update other tables to use is_admin() instead of recursive subqueries
drop policy if exists "Admins manage vehicles" on public.vehicles;
create policy "Admins manage vehicles"
  on public.vehicles
  for all
  using (public.is_admin() or auth.role() = 'service_role');

drop policy if exists "Admins manage drivers" on public.drivers;
create policy "Admins manage drivers"
  on public.drivers
  for all
  using (public.is_admin() or auth.role() = 'service_role');

drop policy if exists "Admins manage deliveries" on public.deliveries;
create policy "Admins manage deliveries"
  on public.deliveries
  for all
  using (public.is_admin() or auth.role() = 'service_role');

drop policy if exists "Admins manage route plans" on public.route_plans;
create policy "Admins manage route plans"
  on public.route_plans
  for all
  using (public.is_admin() or auth.role() = 'service_role');

drop policy if exists "Admins manage route stops" on public.route_stops;
create policy "Admins manage route stops"
  on public.route_stops
  for all
  using (public.is_admin() or auth.role() = 'service_role');

drop policy if exists "Admins manage incidents" on public.incidents;
create policy "Admins manage incidents"
  on public.incidents
  for all
  using (public.is_admin() or auth.role() = 'service_role');

drop policy if exists "Admins manage status history" on public.delivery_status_history;
create policy "Admins manage status history"
  on public.delivery_status_history
  for all
  using (public.is_admin() or auth.role() = 'service_role');

drop policy if exists "Admins manage optimization runs" on public.optimization_runs;
create policy "Admins manage optimization runs"
  on public.optimization_runs
  for all
  using (public.is_admin() or auth.role() = 'service_role');

