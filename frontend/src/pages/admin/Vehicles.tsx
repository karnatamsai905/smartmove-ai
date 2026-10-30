import { useEffect, useState } from 'react';
import { Plus, Search, Truck, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../../services/supabase';
import type { Vehicle, VehicleStatus } from '../../types';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { vehicleStatusColor, vehicleStatusLabel } from '../../utils/helpers';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetch = async () => {
    setLoading(true);
    const q = supabase.from('vehicles').select('*').order('created_at', { ascending: false });
    const { data } = await q;
    setVehicles(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const filtered = vehicles.filter((v) => {
    const matchSearch = v.registration_number.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter ? v.status === statusFilter : true;
    return matchSearch && matchStatus;
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await supabase.from('vehicles').delete().eq('id', deleteId);
    setDeleteId(null);
    setDeleting(false);
    fetch();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vehicles</h1>
          <p className="text-sm text-slate-500">Manage your fleet</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Add Vehicle
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by registration…"
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as VehicleStatus | '')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="available">Available</option>
          <option value="on_delivery">On Delivery</option>
          <option value="maintenance">Maintenance</option>
          <option value="out_of_service">Out of Service</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No vehicles found"
            description={search || statusFilter ? "Try adjusting your filters." : "Add your first vehicle to get started."}
            action={
              <button
                onClick={() => { setEditing(null); setShowForm(true); }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Add Vehicle
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Registration', 'Type', 'Capacity (kg)', 'Fuel', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{v.registration_number}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{v.vehicle_type}</td>
                    <td className="px-4 py-3 text-slate-600">{v.max_capacity}</td>
                    <td className="px-4 py-3 text-slate-600 capitalize">{v.fuel_type}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${vehicleStatusColor(v.status)}`}>
                        {vehicleStatusLabel(v.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditing(v); setShowForm(true); }}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteId(v.id)}
                          className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vehicle Form Modal */}
      {showForm && (
        <VehicleForm
          vehicle={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetch(); }}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Vehicle"
        message="Are you sure you want to delete this vehicle? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

function VehicleForm({ vehicle, onClose, onSaved }: { vehicle: Vehicle | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    registration_number: vehicle?.registration_number ?? '',
    vehicle_type: vehicle?.vehicle_type ?? 'van',
    max_capacity: vehicle?.max_capacity ?? 500,
    fuel_type: vehicle?.fuel_type ?? 'diesel',
    status: vehicle?.status ?? 'available',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handle = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (vehicle) {
        const { error: err } = await supabase.from('vehicles').update(form).eq('id', vehicle.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('vehicles').insert(form);
        if (err) throw err;
      }
      onSaved();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Save failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="font-semibold text-slate-900">{vehicle ? 'Edit Vehicle' : 'Add Vehicle'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
          <Field label="Registration Number">
            <input required value={form.registration_number} onChange={(e) => handle('registration_number', e.target.value)}
              className={inputCls} placeholder="TN01AB1234" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <select value={form.vehicle_type} onChange={(e) => handle('vehicle_type', e.target.value)} className={inputCls}>
                <option value="van">Van</option>
                <option value="truck">Truck</option>
                <option value="motorcycle">Motorcycle</option>
                <option value="car">Car</option>
              </select>
            </Field>
            <Field label="Capacity (kg)">
              <input type="number" required min={1} value={form.max_capacity}
                onChange={(e) => handle('max_capacity', parseFloat(e.target.value))} className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fuel Type">
              <select value={form.fuel_type} onChange={(e) => handle('fuel_type', e.target.value)} className={inputCls}>
                <option value="petrol">Petrol</option>
                <option value="diesel">Diesel</option>
                <option value="electric">Electric</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => handle('status', e.target.value)} className={inputCls}>
                <option value="available">Available</option>
                <option value="on_delivery">On Delivery</option>
                <option value="maintenance">Maintenance</option>
                <option value="out_of_service">Out of Service</option>
              </select>
            </Field>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Saving…' : 'Save Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
