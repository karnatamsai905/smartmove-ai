-- ============================================================
-- SmartMove AI - Demo Seed Data (Chennai Logistics Hub)
-- ============================================================

-- Clean up existing demo data
truncate table public.notifications cascade;
truncate table public.optimization_runs cascade;
truncate table public.incidents cascade;
truncate table public.delivery_status_history cascade;
truncate table public.route_stops cascade;
truncate table public.route_plans cascade;
truncate table public.deliveries cascade;
truncate table public.drivers cascade;
truncate table public.vehicles cascade;

-- 1. Sample Vehicles
insert into public.vehicles (id, registration_number, vehicle_type, max_capacity, fuel_type, status, current_lat, current_lng) values
  ('11111111-1111-1111-1111-111111111111', 'TN 01 AB 1001', 'van', 500.0, 'diesel', 'available', 13.0827, 80.2707),
  ('22222222-2222-2222-2222-222222222222', 'TN 02 CD 2002', 'truck', 1200.0, 'diesel', 'available', 13.0827, 80.2707),
  ('33333333-3333-3333-3333-333333333333', 'TN 07 EF 3003', 'motorcycle', 40.0, 'petrol', 'available', 13.0827, 80.2707);

-- 2. Sample Drivers
-- Note: Replace profile_id with actual auth user IDs after users sign up, or link them via Admin panel
insert into public.drivers (id, profile_id, full_name, email, phone, license_number, status, assigned_vehicle_id) values
  ('aaaa1111-1111-1111-1111-111111111111', null, 'Karthik Subramanian', 'karthik@smartmove.demo', '+91 98401 12345', 'DL-TN01-2018-00124', 'available', '11111111-1111-1111-1111-111111111111'),
  ('bbbb2222-2222-2222-2222-222222222222', null, 'Ramesh Kumar', 'ramesh@smartmove.demo', '+91 98402 23456', 'DL-TN02-2016-00982', 'available', '22222222-2222-2222-2222-222222222222'),
  ('cccc3333-3333-3333-3333-333333333333', null, 'Praveen Raj', 'praveen@smartmove.demo', '+91 98403 34567', 'DL-TN07-2020-00431', 'available', '33333333-3333-3333-3333-333333333333');

-- Link drivers to vehicles
update public.vehicles set assigned_driver_id = 'aaaa1111-1111-1111-1111-111111111111' where id = '11111111-1111-1111-1111-111111111111';
update public.vehicles set assigned_driver_id = 'bbbb2222-2222-2222-2222-222222222222' where id = '22222222-2222-2222-2222-222222222222';
update public.vehicles set assigned_driver_id = 'cccc3333-3333-3333-3333-333333333333' where id = '33333333-3333-3333-3333-333333333333';

-- 3. 10 Sample Deliveries across Chennai
insert into public.deliveries (id, customer_name, customer_phone, delivery_address, lat, lng, package_weight, priority, time_window_start, time_window_end, status, notes) values
  ('d1000001-0000-0000-0000-000000000001', 'Ananya Sundaram', '+91 98401 55001', 'Usman Road, T. Nagar, Chennai, Tamil Nadu 600017', 13.0418, 80.2341, 15.5, 'urgent', '09:00', '12:00', 'pending', 'Fragile electronic equipment'),
  ('d1000002-0000-0000-0000-000000000002', 'Suresh Balaji', '+91 98401 55002', 'Gandhi Nagar 2nd Main Rd, Adyar, Chennai 600020', 13.0067, 80.2575, 45.0, 'high', '10:00', '14:00', 'pending', 'Call customer 15 mins prior'),
  ('d1000003-0000-0000-0000-000000000003', 'Meenakshi Raman', '+91 98401 55003', '100 Feet Bypass Rd, Velachery, Chennai 600042', 12.9815, 80.2180, 8.0, 'normal', '11:00', '16:00', 'pending', 'Leave with security if unavailable'),
  ('d1000004-0000-0000-0000-000000000004', 'Dinesh Chandran', '+91 98401 55004', '2nd Avenue, Anna Nagar, Chennai 600040', 13.0878, 80.2155, 120.0, 'high', '09:30', '13:00', 'pending', 'Heavy industrial parts - requires truck loading'),
  ('d1000005-0000-0000-0000-000000000005', 'Kavitha Natarajan', '+91 98401 55005', 'GST Road, Guindy, Chennai 600032', 13.0067, 80.2025, 22.0, 'normal', '13:00', '17:00', 'pending', 'Standard retail goods delivery'),
  ('d1000006-0000-0000-0000-000000000006', 'Venkatesh Raghavan', '+91 98401 55006', 'Luz Church Road, Mylapore, Chennai 600004', 13.0339, 80.2644, 5.0, 'urgent', '10:00', '12:30', 'pending', 'Emergency medical sample container'),
  ('d1000007-0000-0000-0000-000000000007', 'Deepak Srinivasan', '+91 98401 55007', 'Montieth Road, Egmore, Chennai 600008', 13.0732, 80.2609, 12.5, 'low', '14:00', '18:00', 'pending', 'Office supplies'),
  ('d1000008-0000-0000-0000-000000000008', 'Swaminathan Iyer', '+91 98401 55008', 'Khader Nawaz Khan Rd, Nungambakkam, Chennai 600006', 13.0604, 80.2464, 3.5, 'normal', '11:00', '15:00', 'pending', 'Apparel parcel'),
  ('d1000009-0000-0000-0000-000000000009', 'Aravind Mohan', '+91 98401 55009', 'Rajiv Gandhi Salai, OMR, Sholinganallur, Chennai 600119', 12.9010, 80.2279, 70.0, 'high', '12:00', '17:00', 'pending', 'IT equipment distribution'),
  ('d1000010-0000-0000-0000-000000010', 'Priya Varadarajan', '+91 98401 55010', 'Mount Poonamallee High Rd, Porur, Chennai 600116', 13.0382, 80.1565, 30.0, 'low', '10:00', '18:00', 'pending', 'General merchandise package');

