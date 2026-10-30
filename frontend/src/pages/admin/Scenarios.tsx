import { useState, useEffect } from 'react';
import {
  Truck, AlertTriangle, Plus, CheckCircle,
  Play, Loader2, Sparkles
} from 'lucide-react';
import api from '../../services/api';
import { supabase } from '../../services/supabase';
import { useToast } from '../../components/common/Toast';
import FleetMap from '../../components/map/FleetMap';
import type { Vehicle } from '../../types';

export default function ScenariosPage() {
  const [selectedType, setSelectedType] = useState<string>('breakdown');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [urgentForm, setUrgentForm] = useState({
    customer_name: 'Dr. Anita Sen (Apollo Hospital)',
    delivery_address: 'Greams Road, Thousand Lights, Chennai',
    lat: 13.0569,
    lng: 80.2505,
    package_weight: 8.5,
  });
  const [loading, setLoading] = useState(false);
  const [simResult, setSimResult] = useState<any | null>(null);
  const [approving, setApproving] = useState(false);
  const { success, error, info } = useToast();

  useEffect(() => {
    supabase.from('vehicles').select('*').then(({ data }) => {
      const list = data || [];
      setVehicles(list);
      if (list.length > 0) setSelectedVehicleId(list[0].id);
    });
  }, []);

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const payload: any = { scenario_type: selectedType };
      if (selectedType === 'breakdown') {
        payload.disabled_vehicle_id = selectedVehicleId;
      } else if (selectedType === 'urgent_delivery') {
        payload.urgent_delivery = urgentForm;
      } else if (selectedType === 'road_closure') {
        payload.delay_multiplier = 1.8;
      }

      const res = await api.post('/api/scenarios/simulate', payload);
      setSimResult(res.data);
      success('Simulation Ready', 'Disruption modeled with OR-Tools and analyzed by SmartMove AI.');
    } catch (err: any) {
      error('Simulation Failed', err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!simResult?.id) return;
    setApproving(true);
    try {
      await api.post(`/api/scenarios/${simResult.id}/approve`);
      success('Approved!', 'Simulated scenario changes have been approved and deployed.');
      setSimResult(null);
    } catch (err: any) {
      error('Approval Failed', err.response?.data?.detail || err.message);
    } finally {
      setApproving(false);
    }
  };

  const handleDiscard = async () => {
    if (!simResult?.id) return;
    await api.post(`/api/scenarios/${simResult.id}/discard`);
    setSimResult(null);
    info('Simulation Discarded', 'Active route plans remain unaltered.');
  };

  const warehouse = {
    name: 'Chennai Central Warehouse',
    lat: 13.0827,
    lng: 80.2707,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">What-If Scenario Simulator</h1>
        <p className="text-sm text-slate-500">
          Simulate operational disruptions without affecting live active routes until approved
        </p>
      </div>

      {/* Scenario Type Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { id: 'breakdown', label: 'Vehicle Breakdown', icon: Truck, color: 'text-red-600', bg: 'bg-red-50', desc: 'Isolate disabled vehicle & redistribute orders' },
          { id: 'urgent_delivery', label: 'Urgent New Delivery', icon: Plus, color: 'text-orange-600', bg: 'bg-orange-50', desc: 'Insert high-priority emergency order' },
          { id: 'road_closure', label: 'Road Closure / Delay', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', desc: 'Model road segment bottleneck slowdown' },
        ].map((s) => {
          const Icon = s.icon;
          const active = selectedType === s.id;
          return (
            <button
              key={s.id}
              onClick={() => { setSelectedType(s.id); setSimResult(null); }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                active ? 'border-blue-600 bg-blue-50/60 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.bg}`}>
                  <Icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">{s.label}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Configuration Box */}
      <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">Configure Scenario Parameters</h2>

        {selectedType === 'breakdown' && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Select Disabled Vehicle:</label>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="w-full max-w-md rounded-lg border border-slate-200 p-2 text-sm outline-none focus:border-blue-500"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registration_number} — {v.vehicle_type} ({v.max_capacity} kg capacity)
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">
              Deliveries assigned to this vehicle will be redistributed among surviving vehicles with spare capacity.
            </p>
          </div>
        )}

        {selectedType === 'urgent_delivery' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Customer / Organization:</label>
              <input
                value={urgentForm.customer_name}
                onChange={(e) => setUrgentForm({ ...urgentForm, customer_name: e.target.value })}
                className="w-full rounded-lg border border-slate-200 p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Address in Chennai:</label>
              <input
                value={urgentForm.delivery_address}
                onChange={(e) => setUrgentForm({ ...urgentForm, delivery_address: e.target.value })}
                className="w-full rounded-lg border border-slate-200 p-2 text-sm"
              />
            </div>
          </div>
        )}

        {selectedType === 'road_closure' && (
          <p className="text-xs text-slate-600">
            Simulates a traffic bottleneck along primary Chennai arterial corridors (Anna Salai / GST Road).
            OR-Tools and OSRM will compute detour schedules.
          </p>
        )}

        <button
          onClick={handleSimulate}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Running OR-Tools Re-optimization…
            </>
          ) : (
            <>
              <Play className="h-4 w-4 fill-white" />
              Run Scenario Simulation
            </>
          )}
        </button>
      </div>

      {/* Simulation Results & Impact Comparison */}
      {simResult && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Comparison Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-4">
              <span className="text-xs text-slate-500 block">Total Distance</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-slate-900">{simResult.proposed_plan.total_distance_km} km</span>
                <span className={`text-xs font-semibold flex items-center ${
                  simResult.impact.delta_distance_km >= 0 ? 'text-amber-600' : 'text-green-600'
                }`}>
                  {simResult.impact.delta_distance_km >= 0 ? '+' : ''}{simResult.impact.delta_distance_km} km
                </span>
              </div>
              <span className="text-[11px] text-slate-400">vs original plan</span>
            </div>

            <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-4">
              <span className="text-xs text-slate-500 block">Total Travel Time</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-slate-900">{simResult.proposed_plan.total_duration_min} min</span>
                <span className={`text-xs font-semibold flex items-center ${
                  simResult.impact.delta_duration_min >= 0 ? 'text-amber-600' : 'text-green-600'
                }`}>
                  {simResult.impact.delta_duration_min >= 0 ? '+' : ''}{simResult.impact.delta_duration_min} min
                </span>
              </div>
              <span className="text-[11px] text-slate-400">estimated time</span>
            </div>

            <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-4">
              <span className="text-xs text-slate-500 block">Vehicles Utilized</span>
              <span className="text-xl font-bold text-slate-900 block mt-1">
                {simResult.proposed_plan.vehicles_used}
              </span>
              <span className="text-[11px] text-slate-400">active fleet carriers</span>
            </div>

            <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-4">
              <span className="text-xs text-slate-500 block">Est. Fuel Consumption</span>
              <span className="text-xl font-bold text-slate-900 block mt-1">
                {simResult.impact.estimated_fuel_liters} L
              </span>
              <span className="text-[11px] text-slate-400">~12L / 100km model</span>
            </div>
          </div>

          {/* AI Explanation Box */}
          {simResult.ai_explanation && (
            <div className="rounded-xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-5 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-blue-200 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="h-4 w-4 text-blue-400" />
                SmartMove AI Analysis
              </div>
              <div className="text-sm leading-relaxed prose prose-invert max-w-none text-slate-200 whitespace-pre-line">
                {simResult.ai_explanation}
              </div>
            </div>
          )}

          {/* Map Preview */}
          <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-4">
            <h3 className="font-semibold text-slate-800 text-sm mb-3">Proposed Disruption Road Geometry</h3>
            <FleetMap
              warehouse={warehouse}
              routes={simResult.proposed_plan.routes}
              height="380px"
            />
          </div>

          {/* Action Confirmation Bar */}
          <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200 p-4">
            <div className="text-xs text-amber-800">
              <span className="font-bold">Pending Review:</span> Original active plans remain safe in database.
              Approve to commit these route changes to live driver schedules.
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleDiscard}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Discard Simulation
              </button>
              <button
                onClick={handleApprove}
                disabled={approving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 text-xs font-semibold text-white hover:bg-green-700 shadow-sm disabled:opacity-50"
              >
                {approving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                Approve & Commit Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
