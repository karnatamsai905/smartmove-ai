import { useEffect, useState } from 'react';
import {
  BarChart3, Download, TrendingUp, Package,
  CheckCircle2, Clock, Truck, Fuel, ShieldCheck,
  RefreshCw
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell
} from 'recharts';
import api from '../../services/api';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function AnalyticsPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/analytics/overview');
      setData(res.data);
    } catch (e) {
      console.error('Failed to load analytics overview:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleDownloadCSV = () => {
    window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/analytics/export/csv`, '_blank');
  };

  const deliveryData = data?.deliveries ? [
    { name: 'Delivered', count: data.deliveries.completed, fill: '#22c55e' },
    { name: 'Pending', count: data.deliveries.pending, fill: '#f59e0b' },
    { name: 'In Transit', count: data.deliveries.in_transit, fill: '#3b82f6' },
    { name: 'Failed', count: data.deliveries.failed, fill: '#ef4444' },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics & Reports</h1>
          <p className="text-sm text-slate-500">
            Real performance telemetry, fuel impact models, and route optimization savings
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm"
          >
            <Download className="h-4 w-4" /> Export CSV Report
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-24"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard title="Total Deliveries" value={data?.deliveries.total || 0} icon={Package} color="blue" />
            <StatCard title="Delivered" value={data?.deliveries.completed || 0} icon={CheckCircle2} color="green" />
            <StatCard title="Pending" value={data?.deliveries.pending || 0} icon={Clock} color="orange" />
            <StatCard title="Active Fleet" value={data?.fleet.active_vehicles || 0} icon={Truck} color="purple" />
            <StatCard title="Total Road Dist" value={`${data?.operations.total_distance_km || 0} km`} icon={TrendingUp} color="blue" />
            <StatCard title="Fleet Utilization" value={`${data?.fleet.utilization_pct || 0}%`} icon={ShieldCheck} color="slate" />
          </div>

          {/* Route Optimization Savings Banner */}
          <div className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <span className="text-emerald-100 text-xs font-semibold uppercase tracking-wider block">
                  OR-Tools Optimization Impact
                </span>
                <h3 className="text-xl font-bold mt-1">Route Efficiency & Savings Benchmark</h3>
                <p className="text-emerald-50 text-xs max-w-xl mt-1">
                  Comparing OR-Tools multi-vehicle clustered routes against baseline unoptimized dispatch.
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div>
                  <span className="text-xs text-emerald-200 block">Distance Saved</span>
                  <span className="text-2xl font-black">{data?.operations.distance_saved_km || 0} km</span>
                  <span className="text-[10px] text-emerald-200 block">+{data?.operations.savings_percentage}% efficiency</span>
                </div>
                <div className="h-10 w-px bg-white/20"></div>
                <div>
                  <span className="text-xs text-emerald-200 block">Est. Fuel Saved</span>
                  <span className="text-2xl font-black">{data?.operations.estimated_fuel_saved_liters || 0} L</span>
                  <span className="text-[10px] text-emerald-200 block">Diesel / Petrol</span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Delivery Status Distribution */}
            <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                Delivery Status Distribution
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deliveryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {deliveryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Fuel & Environmental Telemetry */}
            <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Fuel className="h-4 w-4 text-emerald-600" />
                Fuel & Operational Telemetry
              </h3>

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-xs text-slate-600 font-medium">Estimated Fuel Consumed</span>
                  <span className="text-sm font-bold text-slate-900">{data?.operations.estimated_fuel_consumed_liters || 0} Liters</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-xs text-slate-600 font-medium">Total Driving Duration</span>
                  <span className="text-sm font-bold text-slate-900">{data?.operations.total_duration_min || 0} Minutes</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-xs text-slate-600 font-medium">Delivery Completion Ratio</span>
                  <span className="text-sm font-bold text-emerald-600">
                    {data?.deliveries.completion_rate_pct || 0}%
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 italic">
                  * {data?.operations.fuel_model_note || 'Configurable vehicle fuel-efficiency assumptions.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
