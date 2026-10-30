import { useState } from 'react';
import { Route, Play, CheckCircle, Trash2, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import api from '../../services/api';
import FleetMap from '../../components/map/FleetMap';
import { useToast } from '../../components/common/Toast';

type Mode = 'distance' | 'time' | 'priority' | 'balanced';

export default function OptimizationPage() {
  const [mode, setMode] = useState<Mode>('balanced');
  const [loading, setLoading] = useState(false);
  const [planResult, setPlanResult] = useState<any | null>(null);
  const [activating, setActivating] = useState(false);
  const { success, error } = useToast();

  const modes: { id: Mode; label: string; desc: string }[] = [
    { id: 'balanced', label: 'Balanced Optimization', desc: 'Weighted mix of distance, travel time, and load' },
    { id: 'distance', label: 'Minimum Distance', desc: 'Shortest total road km traveled by fleet' },
    { id: 'time', label: 'Minimum Travel Time', desc: 'Fastest delivery schedules using OSRM duration' },
    { id: 'priority', label: 'Priority-Based Delivery', desc: 'Urgent and High priority orders prioritized first' },
  ];

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await api.post('/api/optimization/generate', { mode });
      setPlanResult(res.data);
      success('Routes Optimized!', `Successfully planned routes for ${res.data.total_deliveries} deliveries across ${res.data.vehicles_used} vehicles.`);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Optimization failed.';
      error('Optimization Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!planResult?.plan_id) return;
    setActivating(true);
    try {
      await api.post(`/api/optimization/plans/${planResult.plan_id}/activate`);
      success('Plan Activated!', 'Deliveries have been assigned and vehicle routes are now active.');
      setPlanResult({ ...planResult, status: 'active' });
    } catch (err: any) {
      error('Activation Error', err.response?.data?.detail || 'Could not activate plan.');
    } finally {
      setActivating(false);
    }
  };

  const handleDiscard = async () => {
    if (!planResult?.plan_id) return;
    try {
      await api.post(`/api/optimization/plans/${planResult.plan_id}/discard`);
      setPlanResult(null);
      success('Plan Discarded', 'The draft route plan has been cleared.');
    } catch (err: any) {
      error('Discard Error', err.response?.data?.detail || 'Could not discard plan.');
    }
  };

  const warehouse = planResult?.warehouse || {
    name: 'Chennai Central Warehouse',
    lat: 13.0827,
    lng: 80.2707,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">AI Route Optimization</h1>
        <p className="text-sm text-slate-500">
          Google OR-Tools multi-vehicle routing solver with OSRM turn-by-turn road geometry
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">1. Select Optimization Objective</h2>
            <div className="space-y-2">
              {modes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`w-full text-left rounded-xl border-2 p-3 transition-all ${
                    mode === m.id
                      ? 'border-blue-600 bg-blue-50/70 shadow-sm'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <p className={`text-sm font-semibold ${mode === m.id ? 'text-blue-700' : 'text-slate-800'}`}>
                    {m.label}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{m.desc}</p>
                </button>
              ))}
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm disabled:opacity-50 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Calculating OR-Tools VRP Matrix…
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-white" />
                  Generate Optimized Routes
                </>
              )}
            </button>

            <div className="mt-4 rounded-xl bg-slate-50 p-3 border border-slate-100 text-xs text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                OR-Tools Engine Capabilities:
              </div>
              <p>• Capacitated Vehicle Routing (CVRP)</p>
              <p>• Urgent/Priority penalization</p>
              <p>• OSRM road distance table integration</p>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-5">
          {!planResult ? (
            <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mx-auto mb-3">
                <Route className="h-7 w-7" />
              </div>
              <h3 className="font-semibold text-slate-800 text-base">No Route Plan Generated Yet</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                Select an optimization objective on the left and click "Generate Optimized Routes" to run the mathematical solver.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Plan Summary Bar */}
              <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-5">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900">{planResult.name}</h2>
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 uppercase">
                        {planResult.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Mode: <span className="font-medium capitalize">{planResult.optimization_mode}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDiscard}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" /> Discard
                    </button>
                    {planResult.status !== 'active' && (
                      <button
                        onClick={handleActivate}
                        disabled={activating}
                        className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-green-700 shadow-sm"
                      >
                        {activating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                        Approve & Activate Plan
                      </button>
                    )}
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
                  <div>
                    <span className="text-xs text-slate-400 block">Total Road Distance</span>
                    <span className="text-lg font-bold text-slate-900">{planResult.total_distance_km} km</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Est. Travel Time</span>
                    <span className="text-lg font-bold text-slate-900">{planResult.total_duration_min} min</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Vehicles Utilized</span>
                    <span className="text-lg font-bold text-slate-900">{planResult.vehicles_used}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Deliveries Scheduled</span>
                    <span className="text-lg font-bold text-slate-900">{planResult.total_deliveries}</span>
                  </div>
                </div>
              </div>

              {/* Interactive Route Map */}
              <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-4">
                <h3 className="font-semibold text-slate-800 text-sm mb-3">Road Route Visualization (OSRM Geometry)</h3>
                <FleetMap
                  warehouse={warehouse}
                  routes={planResult.routes}
                  height="420px"
                />
              </div>

              {/* Vehicle Routes Detail */}
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-800 text-sm">Vehicle Visiting Sequences</h3>
                {planResult.routes.map((r: any, idx: number) => {
                  if (r.stop_count === 0) return null;
                  return (
                    <div key={r.vehicle_id} className="rounded-xl bg-white border border-slate-100 shadow-sm p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-700 text-xs font-bold">
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-slate-800 text-sm">{r.registration_number}</span>
                            <span className="text-xs text-slate-500 ml-2 capitalize">({r.vehicle_type})</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-600">
                          <span>Dist: <strong>{r.distance_km} km</strong></span>
                          <span>Time: <strong>{r.duration_min} min</strong></span>
                          <span>Payload: <strong>{r.total_load} / {r.capacity} kg</strong></span>
                        </div>
                      </div>

                      {/* Capacity Bar */}
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3 overflow-hidden">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full"
                          style={{ width: `${Math.min(100, r.utilization_pct)}%` }}
                        />
                      </div>

                      {/* Stops list */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        {r.stops.map((s: any, sIdx: number) => (
                          <div key={sIdx} className="flex items-center gap-1">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                              s.is_warehouse
                                ? 'bg-slate-900 text-white'
                                : s.priority === 'urgent'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {s.is_warehouse ? 'Depot' : `${sIdx}. ${s.customer_name?.split(' ')[0] || 'Order'}`}
                            </span>
                            {sIdx < r.stops.length - 1 && <ArrowRight className="h-3 w-3 text-slate-300" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
