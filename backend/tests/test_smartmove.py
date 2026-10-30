import pytest
from app.services.osrm import haversine_distance, OSRMService
from app.optimization.vrp_solver import VRPSolver
from app.services.gemini_service import GeminiService
from app.api.driver import ALLOWED_TRANSITIONS

# 1. Test Haversine distance calculation
def test_haversine_distance():
    # Chennai Central (13.0827, 80.2707) to T. Nagar (13.0418, 80.2341)
    d = haversine_distance((13.0827, 80.2707), (13.0418, 80.2341))
    assert 5000 < d < 8000  # approximately ~6.1 km straight line

# 2. Test OR-Tools Route Optimization Solver
def test_ortools_vrp_solver_basic():
    depot = (13.0827, 80.2707)
    deliveries = [
        {"id": "del-1", "customer_name": "A", "lat": 13.0418, "lng": 80.2341, "package_weight": 10, "priority": "urgent"},
        {"id": "del-2", "customer_name": "B", "lat": 13.0067, "lng": 80.2575, "package_weight": 20, "priority": "normal"},
        {"id": "del-3", "customer_name": "C", "lat": 13.0878, "lng": 80.2155, "package_weight": 15, "priority": "high"},
    ]
    vehicles = [
        {"id": "veh-1", "registration_number": "TN01AB1001", "vehicle_type": "van", "max_capacity": 500},
        {"id": "veh-2", "registration_number": "TN02CD2002", "vehicle_type": "truck", "max_capacity": 1000},
    ]

    all_coords = [depot] + [(d["lat"], d["lng"]) for d in deliveries]
    # Simple distance matrix
    dist_matrix = []
    dur_matrix = []
    for i in range(len(all_coords)):
        dist_row = []
        dur_row = []
        for j in range(len(all_coords)):
            dist = haversine_distance(all_coords[i], all_coords[j])
            dist_row.append(dist)
            dur_row.append(dist / 8.33)
        dist_matrix.append(dist_row)
        dur_matrix.append(dur_row)

    solver = VRPSolver(depot, deliveries, vehicles, dist_matrix, dur_matrix, mode="balanced")
    result = solver.solve()

    assert result["status"] in ["OPTIMAL", "FEASIBLE_PARTIAL"]
    assert result["total_distance_km"] > 0
    assert result["total_deliveries"] == 3
    assert len(result["unassigned"]) == 0

# 3. Test Vehicle Capacity Constraints in OR-Tools
def test_ortools_capacity_constraint():
    depot = (13.0827, 80.2707)
    # Heavy delivery of 600kg, vehicle only holds 500kg
    deliveries = [
        {"id": "heavy-1", "customer_name": "Industrial", "lat": 13.0418, "lng": 80.2341, "package_weight": 600, "priority": "normal"}
    ]
    vehicles = [
        {"id": "small-van", "registration_number": "TN01-SMALL", "max_capacity": 500}
    ]
    coords = [depot, (13.0418, 80.2341)]
    dist_matrix = [[0, 5000], [5000, 0]]
    dur_matrix = [[0, 600], [600, 0]]

    solver = VRPSolver(depot, deliveries, vehicles, dist_matrix, dur_matrix)
    result = solver.solve()

    # The 600kg item exceeds the 500kg vehicle capacity and cannot be legally loaded
    assert "heavy-1" in result["unassigned"] or result["status"] == "INFEASIBLE"

# 4. Test Vehicle Breakdown Reassignment
def test_vehicle_breakdown_redistribution():
    depot = (13.0827, 80.2707)
    deliveries = [
        {"id": "del-1", "customer_name": "A", "lat": 13.0418, "lng": 80.2341, "package_weight": 20, "priority": "high"},
        {"id": "del-2", "customer_name": "B", "lat": 13.0067, "lng": 80.2575, "package_weight": 30, "priority": "normal"},
    ]
    # Remaining surviving vehicle after breakdown
    surviving_vehicles = [
        {"id": "veh-2", "registration_number": "TN02-SURVIVING", "max_capacity": 500}
    ]
    coords = [depot, (13.0418, 80.2341), (13.0067, 80.2575)]
    dist_matrix = [[0, 5000, 7000], [5000, 0, 4000], [7000, 4000, 0]]
    dur_matrix = [[0, 600, 800], [600, 0, 500], [800, 500, 0]]

    solver = VRPSolver(depot, deliveries, surviving_vehicles, dist_matrix, dur_matrix)
    result = solver.solve()

    assert result["total_deliveries"] == 2
    active_routes = [r for r in result["routes"] if r["stop_count"] > 0]
    assert len(active_routes) == 1
    assert active_routes[0]["vehicle_id"] == "veh-2"

# 5. Test Driver Delivery State Transitions
def test_driver_status_transitions():
    assert "assigned" in ALLOWED_TRANSITIONS["pending"]
    assert "picked_up" in ALLOWED_TRANSITIONS["assigned"]
    assert "in_transit" in ALLOWED_TRANSITIONS["picked_up"]
    assert "delivered" in ALLOWED_TRANSITIONS["in_transit"]
    assert "failed" in ALLOWED_TRANSITIONS["in_transit"]

    # Invalid jump directly from pending to delivered
    assert "delivered" not in ALLOWED_TRANSITIONS["pending"]

# 6. Test Gemini Intent Detection and Fallback Rule Engine
def test_gemini_intent_detection():
    service = GeminiService()
    assert service._detect_intent("Please optimize all pending deliveries") == "optimize"
    assert service._detect_intent("Vehicle 2 broke down on road") == "breakdown"
    assert service._detect_intent("What is the workload of my fleet?") == "workload"
    assert service._detect_intent("Show deliveries that may be delayed") == "delay"

# 7. Test AI Fallback Response Generation
@pytest.mark.asyncio
async def test_gemini_rule_fallback_response():
    service = GeminiService()
    context = {
        "pending_deliveries": 10,
        "total_vehicles": 3,
        "vehicles_sample": [{"registration_number": "TN 01 AB 1001", "max_capacity": 500}],
        "deliveries_sample": []
    }
    res = await service.chat("Optimize all pending deliveries", context)
    assert res["intent"] == "optimize"
    assert "10 pending deliveries" in res["response"]
    assert res["requires_approval"] is True

