# SmartMove AI — Intelligent Delivery & Route Optimization Platform

SmartMove AI is an AI-powered logistics SaaS platform that helps fleet operators and dispatchers optimize delivery routes, assign orders across multiple vehicles respecting capacities, handle vehicle breakdown disruptions in real time, and assist dispatchers with natural language logistics queries powered by Google Gemini.

---

## 1. Project Architecture & Structure

```
smartmove-ai/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/       # StatCard, EmptyState, LoadingSpinner, Toast, ConfirmDialog
│   │   │   ├── layout/       # AdminLayout, DriverLayout
│   │   │   └── map/          # FleetMap (Leaflet + OpenStreetMap + OSRM routes)
│   │   ├── context/          # AuthContext (Supabase Auth & Session persistence)
│   │   ├── hooks/            # useAuth, useToast
│   │   ├── pages/
│   │   │   ├── auth/         # LoginPage, RegisterPage, ForgotPasswordPage
│   │   │   ├── admin/        # Dashboard, Vehicles, Drivers, Deliveries, MapPage,
│   │   │   │                 # Optimization, Assistant, Scenarios, Alerts, Analytics, Settings
│   │   │   └── driver/       # DriverDashboard
│   │   ├── services/         # api.ts (Axios), supabase.ts (Client)
│   │   ├── types/            # TypeScript domain interfaces
│   │   ├── utils/            # helpers (date, status colors, formatting)
│   │   ├── App.tsx           # React Router route hierarchy & guards
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/
│   ├── app/
│   │   ├── api/              # vehicles, drivers, deliveries, optimization, scenarios, ai, driver, analytics
│   │   ├── core/             # config, security (Supabase JWT auth & roles)
│   │   ├── database/         # supabase_client.py
│   │   ├── models/
│   │   ├── optimization/     # vrp_solver.py (Google OR-Tools CVRP solver)
│   │   ├── schemas/          # Pydantic validation schemas
│   │   ├── services/         # osrm.py (Road table & geometry), nominatim.py (Geocoding), gemini_service.py
│   │   └── main.py           # FastAPI application
│   ├── tests/                # test_smartmove.py
│   └── requirements.txt
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql  # 10 PostgreSQL tables, triggers, and Row Level Security
│   └── seed.sql              # Chennai Metro vehicles, drivers, and 10 sample orders
├── .env.example
├── .gitignore
└── README.md
```

---

## 2. Key Capabilities

1. **OR-Tools Multi-Vehicle VRP Solver**: Mathematical optimization solving Capacitated Vehicle Routing Problem (CVRP) with priorities, capacities, and depot constraints.
2. **Turn-by-Turn Road Geometry (OSRM)**: Calculates true road network distances, travel durations, and GeoJSON route geometry (no fake straight lines).
3. **SmartMove AI Assistant (Gemini API)**: Interprets natural language requests ("Optimize pending deliveries", "Which vehicle has highest workload?"), providing actionable recommendations.
4. **What-If Scenario Simulator**: Simulates vehicle breakdowns, urgent orders, and road closures; computes delta distance, time, and fuel consumption before committing changes.
5. **Interactive Leaflet Fleet Map**: OpenStreetMap visualizer with vehicle pins, priority delivery markers, and vehicle-specific color-coded road paths.
6. **Role-Based Portals**:
   - **Admin Portal**: Fleet, driver, and delivery management, optimizer, scenario simulator, telemetry analytics, and alerts.
   - **Driver Portal**: Assigned vehicle details, visiting stop sequence, status progression (`assigned` → `picked_up` → `in_transit` → `delivered`), and incident reporting.
7. **Comprehensive Audit & Analytics**: Tracks historical delivery status changes, fuel savings compared to unoptimized baseline, and allows one-click CSV export.

---

## 3. Environment Variables Setup

### Frontend (`frontend/.env`)
Create `frontend/.env` using `frontend/.env.example`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_BASE_URL=http://localhost:8000
```

### Backend (`backend/.env`)
Create `backend/.env` using `backend/.env.example`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
GEMINI_API_KEY=your-gemini-api-key
WAREHOUSE_LAT=13.0827
WAREHOUSE_LNG=80.2707
WAREHOUSE_NAME=Chennai Central Warehouse
OSRM_BASE_URL=https://router.project-osrm.org
NOMINATIM_BASE_URL=https://nominatim.openstreetmap.org
```

---

## 4. Supabase Database & Migrations Setup

1. Log into your [Supabase Console](https://supabase.com).
2. Open the **SQL Editor**.
3. Copy and run the contents of [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql). This configures:
   - `profiles`, `vehicles`, `drivers`, `deliveries`, `route_plans`, `route_stops`, `delivery_status_history`, `incidents`, `optimization_runs`, `notifications`.
   - Triggers for automatic `updated_at` management and profile provisioning on signup.
   - Row Level Security (RLS) policies for Admins and Drivers.
4. Run the contents of [`supabase/seed.sql`](supabase/seed.sql) to populate 3 Chennai fleet vehicles, 3 drivers, and 10 illustrative Chennai metro delivery orders.

---

## 5. Running the Application

### Backend Startup (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
API Documentation will be available at: `http://localhost:8000/docs`

### Frontend Startup (React + Vite)
```bash
cd frontend
pnpm install
pnpm dev
```
The web dashboard will be available at: `http://localhost:5173`

---

## 6. Demo Login & Roles

1. **Register Admin**:
   - Go to `/register`
   - Select the **🏢 Admin** role
   - Enter your email and password
   - Sign in to explore the Admin Operations Dashboard

2. **Register Driver**:
   - Go to `/register`
   - Select the **🚗 Driver** role
   - Sign in to access the Driver Duty Dashboard

---

## 7. Automated Testing

Run the backend test suite:
```bash
cd backend
pytest tests/ -v
```
Test suite verifies:
- Haversine distance and OSRM coordinate calculations
- OR-Tools Capacitated Vehicle Routing Problem (CVRP) solver
- Vehicle capacity constraint enforcement (overweight rejection)
- Vehicle breakdown dynamic re-assignment
- Driver delivery state-machine transition validation
- Gemini logistics intent parsing and rule engine fallback

---

## 8. Limitations & Future Roadmap

- **Live GPS Telemetry**: Real GPS tracker hardware integration (e.g. MQTT / OBD-II dongles) can replace static coordinates in future phases.
- **Dynamic Time-Window Traffic**: Live traffic density APIs (e.g. TomTom / Google Traffic) can enhance OSRM baseline duration matrices during rush hour.
- **Push Notifications**: WebPush / FCM notifications when an urgent order is assigned or a breakdown is reported.

