import logging
from typing import List, Dict, Any, Tuple, Optional
from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp

logger = logging.getLogger(__name__)

class VRPSolver:
    """
    Multi-Vehicle Route Optimization engine using Google OR-Tools.
    Solves Capacitated Vehicle Routing Problem (CVRP) with Priority weighting.
    """

    def __init__(
        self,
        depot_coord: Tuple[float, float],
        deliveries: List[Dict[str, Any]],
        vehicles: List[Dict[str, Any]],
        distance_matrix: List[List[float]],
        duration_matrix: List[List[float]],
        mode: str = "balanced"
    ):
        self.depot_coord = depot_coord
        self.deliveries = deliveries
        self.vehicles = vehicles
        self.distance_matrix = distance_matrix
        self.duration_matrix = duration_matrix
        self.mode = mode.lower()  # 'distance', 'time', 'priority', 'balanced'

        # Priority multipliers for drop penalties & cost bonuses
        self.priority_weights = {
            "urgent": 1000000,
            "high": 500000,
            "normal": 100000,
            "low": 50000,
        }

    def solve(self) -> Dict[str, Any]:
        num_locations = len(self.deliveries) + 1  # 0 is depot
        num_vehicles = len(self.vehicles)

        if num_locations <= 1 or num_vehicles == 0:
            return {
                "status": "NO_DATA",
                "routes": [],
                "unassigned": [d["id"] for d in self.deliveries],
                "total_distance_km": 0.0,
                "total_duration_min": 0.0,
            }

        # Manager: num_nodes, num_vehicles, starts, ends (all start & end at depot 0)
        manager = pywrapcp.RoutingIndexManager(
            num_locations,
            num_vehicles,
            0  # depot index
        )

        routing = pywrapcp.RoutingModel(manager)

        # 1. Cost Evaluator callback
        def distance_callback(from_index: int, to_index: int) -> int:
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return int(self.distance_matrix[from_node][to_node])

        def duration_callback(from_index: int, to_index: int) -> int:
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            return int(self.duration_matrix[from_node][to_node])

        def balanced_callback(from_index: int, to_index: int) -> int:
            from_node = manager.IndexToNode(from_index)
            to_node = manager.IndexToNode(to_index)
            # 70% distance (meters) + 30% duration (seconds * 8.33 m/s)
            dist = self.distance_matrix[from_node][to_node]
            dur = self.duration_matrix[from_node][to_node]
            return int(dist * 0.7 + dur * 8.33 * 0.3)

        if self.mode == "distance":
            transit_callback_index = routing.RegisterTransitCallback(distance_callback)
        elif self.mode == "time":
            transit_callback_index = routing.RegisterTransitCallback(duration_callback)
        else:
            transit_callback_index = routing.RegisterTransitCallback(balanced_callback)

        routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

        # 2. Demand & Capacity Dimension
        # Demands: index 0 is depot (0), indices 1..N correspond to deliveries[0..N-1]
        demands = [0] + [int(d.get("package_weight", 1)) for d in self.deliveries]
        vehicle_capacities = [int(v.get("max_capacity", 500)) for v in self.vehicles]

        def demand_callback(from_index: int) -> int:
            from_node = manager.IndexToNode(from_index)
            return demands[from_node]

        demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)

        routing.AddDimensionWithVehicleCapacity(
            demand_callback_index,
            0,  # null capacity slack
            vehicle_capacities,  # vehicle maximum capacities
            True,  # start cumul to zero
            "Capacity"
        )

        # 3. Disjunction penalties for priority handling (allow dropped nodes if capacity exceeded)
        for i, delivery in enumerate(self.deliveries):
            node_idx = i + 1
            node_index = manager.NodeToIndex(node_idx)
            priority = delivery.get("priority", "normal")
            penalty = self.priority_weights.get(priority, 100000)
            routing.AddDisjunction([node_index], penalty)

        # 4. Search parameters
        search_parameters = pywrapcp.DefaultRoutingSearchParameters()
        search_parameters.first_solution_strategy = (
            routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
        )
        search_parameters.local_search_metaheuristic = (
            routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
        )
        search_parameters.time_limit.seconds = 3

        # 5. Solve
        solution = routing.SolveWithParameters(search_parameters)

        if not solution:
            return {
                "status": "INFEASIBLE",
                "routes": [],
                "unassigned": [d["id"] for d in self.deliveries],
                "total_distance_km": 0.0,
                "total_duration_min": 0.0,
                "error": "Could not find a feasible route solution with given vehicle capacities."
            }

        # 6. Extract Solution
        routes_output = []
        total_dist_m = 0.0
        total_dur_s = 0.0
        assigned_delivery_ids = set()

        for vehicle_idx, vehicle in enumerate(self.vehicles):
            index = routing.Start(vehicle_idx)
            vehicle_stops = []
            route_dist = 0.0
            route_dur = 0.0
            current_load = 0
            seq = 0

            # Start depot stop
            vehicle_stops.append({
                "stop_sequence": seq,
                "is_warehouse": True,
                "delivery_id": None,
                "lat": self.depot_coord[0],
                "lng": self.depot_coord[1],
                "customer_name": "Chennai Central Warehouse (Depot)",
                "load_kg": current_load,
            })

            while not routing.IsEnd(index):
                previous_index = index
                index = solution.Value(routing.NextVar(index))

                prev_node = manager.IndexToNode(previous_index)
                curr_node = manager.IndexToNode(index)

                route_dist += self.distance_matrix[prev_node][curr_node]
                route_dur += self.duration_matrix[prev_node][curr_node]

                if not routing.IsEnd(index):
                    delivery_idx = curr_node - 1
                    deliv = self.deliveries[delivery_idx]
                    assigned_delivery_ids.add(deliv["id"])
                    current_load += int(deliv.get("package_weight", 1))
                    seq += 1

                    vehicle_stops.append({
                        "stop_sequence": seq,
                        "is_warehouse": False,
                        "delivery_id": deliv["id"],
                        "lat": deliv["lat"],
                        "lng": deliv["lng"],
                        "customer_name": deliv["customer_name"],
                        "address": deliv.get("delivery_address", ""),
                        "priority": deliv.get("priority", "normal"),
                        "package_weight": deliv.get("package_weight", 1),
                        "load_kg": current_load,
                    })

            # Return depot stop (end)
            seq += 1
            vehicle_stops.append({
                "stop_sequence": seq,
                "is_warehouse": True,
                "delivery_id": None,
                "lat": self.depot_coord[0],
                "lng": self.depot_coord[1],
                "customer_name": "Return to Warehouse",
                "load_kg": current_load,
            })

            total_dist_m += route_dist
            total_dur_s += route_dur

            routes_output.append({
                "vehicle_id": vehicle["id"],
                "registration_number": vehicle.get("registration_number", "Vehicle"),
                "vehicle_type": vehicle.get("vehicle_type", "van"),
                "capacity": vehicle.get("max_capacity", 500),
                "total_load": current_load,
                "utilization_pct": round((current_load / vehicle.get("max_capacity", 500)) * 100, 1) if vehicle.get("max_capacity") else 0,
                "distance_km": round(route_dist / 1000, 2),
                "duration_min": round(route_dur / 60, 1),
                "stops": vehicle_stops,
                "stop_count": len([s for s in vehicle_stops if not s["is_warehouse"]]),
            })

        unassigned = [d["id"] for d in self.deliveries if d["id"] not in assigned_delivery_ids]

        return {
            "status": "OPTIMAL" if len(unassigned) == 0 else "FEASIBLE_PARTIAL",
            "routes": routes_output,
            "unassigned": unassigned,
            "total_distance_km": round(total_dist_m / 1000, 2),
            "total_duration_min": round(total_dur_s / 60, 1),
            "total_deliveries": len(assigned_delivery_ids),
        }

