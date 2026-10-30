import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck, Users, CheckCircle2, Clock, AlertTriangle,
  Navigation, Activity, Plus, Map, Route, TrendingUp, Sparkles,
  ArrowRight
} from 'lucide-react';
import StatCard from '../../components/common/StatCard';
import FleetMap from '../../components/map/FleetMap';
import { supabase } from '../../services/supabase';
import type { DashboardStats, Vehicle, Delivery } from '../../types';

type DateFilter = 'today' | '7d' | '30d';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    total_vehicles: 0, active_vehicles: 0, total_drivers: 0,
    pending_deliveries: 0, completed_deliveries: 0, delayed_deliveries: 0,
    total_distance_km: 0, fleet_utilization: 0,
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [filter, setFilter] = useState<DateFilter>('today');
  const [loading, setLoading] = useState(true);

  const warehouse = {
    name: 'Chennai Central Warehouse',
    lat: 13.0827,
    lng: 80.2707,
  };

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [v, d, del, p] = await Promise.all([
          supabase.from('vehicles').select('*'),
          supabase.from('drivers').select('status'),
          supabase.from('deliveries').select('*'),
          supabase.from('route_plans').select('total_distance_km, status'),
        ]);

        const vehList = v.data || [];
        const drvList = d.data || [];
        const delList = del.data || [];
        const planList = p.data || [];

        setVehicles(vehList);
        setDeliveries(delList);

        const totalDist = planList
          .filter((x: any) => x.status === 'active' || x.status === 'completed')
          .reduce((sum: number, x: any) => sum + Number(x.total_distance_km || 0), 0);

        const activeCount = vehList.filter((x: any) => x.status === 'on_delivery').length;

        setStats({
          total_vehicles: vehList.length,
          active_vehicles: activeCount,
          total_drivers: drvList.length,
          pending_deliveries: delList.filter((x: any) => x.status === 'pending' || x.status === 'assigned').length,
          completed_deliveries: delList.filter((x: any) => x.status === 'delivered').length,
          delayed_deliveries: delList.filter((x: any) => x.status === 'failed').length,
          total_distance_km: Math.round(totalDist * 10) / 10,
          fleet_utilization: vehList.length
            ? Math.round((activeCount / vehList.length) * 100)
            : 0,
        });
      } catch (e) {
        console.error('Error fetching dashboard stats:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [filter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operations Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Chennai Metro Delivery Logistics & Fleet Telemetry</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          {(['today', '7d', '30d'] as DateFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                filter === f ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f === 'today' ? 'Today' : f === '7d' ? 'Last 7 days' : 'Last 30 days'}
            </button>
          ))}
        </div>
      </div>

      {/* Top Statistics Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Vehicles" value={loading ? '—' : stats.total_vehicles} icon={Truck} color="blue" />
        <StatCard title="Active En Route" value={loading ? '—' : stats.active_vehicles} icon={Navigation} color="green" />
        <StatCard title="Fleet Drivers" value={loading ? '—' : stats.total_drivers} icon={Users} color="purple" />
        <StatCard title="Fleet Utilization" value={loading ? '—' : `${stats.fleet_utilization}%`} icon={Activity} color="slate" />
        <StatCard title="Pending Orders" value={loading ? '—' : stats.pending_deliveries} icon={Clock} color="orange" />
        <StatCard title="Completed Orders" value={loading ? '—' : stats.completed_deliveries} icon={CheckCircle2} color="green" />
        <StatCard title="Failed / Delayed" value={loading ? '—' : stats.delayed_deliveries} icon={AlertTriangle} color="red" />
        <StatCard title="Total Distance" value={loading ? '—' : `${stats.total_distance_km} km`} icon={TrendingUp} color="blue" />
      </div>

      {/* Quick Action Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/admin/optimization"
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition-all"
        >
          <Route className="h-4 w-4" /> AI Route Optimizer
        </Link>
        <Link
          to="/admin/deliveries"
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
        >
          <Plus className="h-4 w-4" /> Add Delivery
        </Link>
        <Link
          to="/admin/scenarios"
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
        >
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Simulate Breakdown
        </Link>
        <Link
          to="/admin/map"
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-all"
        >
          <Map className="h-4 w-4 text-blue-500" /> Fullscreen Map
        </Link>
      </div>

      {/* Embedded Live Fleet Map & AI Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Map className="h-4 w-4 text-blue-600" />
              Live Fleet & Delivery Map (Chennai Central)
            </h2>
            <Link to="/admin/map" className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1">
              Expand map <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <FleetMap
            warehouse={warehouse}
            vehicles={vehicles}
            deliveries={deliveries}
            height="380px"
          />
        </div>

        {/* AI Recommendations & Live Insights */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-[#0f1729] to-[#1e2d4e] p-5 text-white shadow-md space-y-3">
            <div className="flex items-center gap-2 text-blue-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-4 w-4 text-blue-400" />
              SmartMove AI Recommendations
            </div>

            <p className="text-xs text-slate-200 leading-relaxed">
              {stats.pending_deliveries > 0
                ? `You have ${stats.pending_deliveries} unassigned deliveries across Chennai. Running OR-Tools Balanced Optimization can group these by geographic cluster and save up to ~22% in fuel and road travel time.`
                : "All delivery orders are currently assigned or delivered. Great job keeping the Chennai dispatch network efficient!"}
            </p>

            <Link
              to="/admin/assistant"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3.5 py-2 text-xs font-semibold text-white transition-colors"
            >
              Ask AI Assistant <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Recent Orders Overview */}
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Recent Deliveries</h3>
            <div className="space-y-2.5">
              {deliveries.slice(0, 4).map((d) => (
                <div key={d.id} className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-slate-800 truncate">{d.customer_name}</p>
                    <p className="text-slate-400 text-[11px] truncate">{d.delivery_address}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-medium text-[10px] shrink-0 ${
                    d.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {d.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
