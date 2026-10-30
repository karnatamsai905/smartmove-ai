import { useEffect, useState } from 'react';
import { Plus, Search, Users, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../../services/supabase';
import type { Driver, DriverStatus } from '../../types';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const statusColor = (s: DriverStatus) => ({
  available: 'bg-green-100 text-green-700',
  on_duty:   'bg-blue-100 text-blue-700',
  off_duty:  'bg-slate-100 text-slate-600',
}[s] ?? 'bg-gray-100 text-gray-600');

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DriverStatus | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase.from('drivers').select('*').order('created_at', { ascending: false });
    setDrivers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const filtered = drivers.filter((d) => {
    const matchSearch = d.full_name.toLowerCase().includes(search.toLowerCase()) ||
      d.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter ? d.status === statusFilter : true;
    return matchSearch && matchStatus;
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await supabase.from('drivers').delete().eq('id', deleteId);
    setDeleteId(null);
    setDeleting(false);
    fetch();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Drivers</h1>
          <p className="text-sm text-slate-500">Manage your driver workforce</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Driver
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as DriverStatus | '')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
          <option value="">All Statuses</option>
          <option value="available">Available</option>
          <option value="on_duty">On Duty</option>
          <option value="off_duty">Off Duty</option>
        </select>
      </div>

      <div className="rounded-xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="No drivers found"
            description={search || statusFilter ? "Try adjusting your filters." : "Add your first driver to get started."}
            action={<button onClick={() => { setEditing(null); setShowForm(true); }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Add Driver</button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Name', 'Email', 'Phone', 'License', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{d.full_name}</td>
                    <td className="px-4 py-3 text-slate-600">{d.email}</td>
                    <td className="px-4 py-3 text-slate-600">{d.phone}</td>
                    <td className="px-4 py-3 text-slate-600">{d.license_number}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor(d.status)}`}>
                        {d.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => { setEditing(d); setShowForm(true); }}
                          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteId(d.id)}
                          className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
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

      {showForm && (
        <DriverForm driver={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetch(); }} />
      )}
      <ConfirmDialog open={!!deleteId} title="Delete Driver" message="Delete this driver record? This cannot be undone."
        confirmLabel="Delete" variant="danger" loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}

function DriverForm({ driver, onClose, onSaved }: { driver: Driver | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    full_name: driver?.full_name ?? '',
    email: driver?.email ?? '',
    phone: driver?.phone ?? '',
    license_number: driver?.license_number ?? '',
    status: driver?.status ?? 'available',
    profile_id: driver?.profile_id ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const h = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const cls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (driver) {
        const { error: err } = await supabase.from('drivers').update(form).eq('id', driver.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('drivers').insert(form);
        if (err) throw err;
      }
      onSaved();
    } catch (err: unknown) { setError((err as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="font-semibold text-slate-900">{driver ? 'Edit Driver' : 'Add Driver'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
              <input required value={form.full_name} onChange={(e) => h('full_name', e.target.value)} className={cls} /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input type="email" required value={form.email} onChange={(e) => h('email', e.target.value)} className={cls} /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
              <input required value={form.phone} onChange={(e) => h('phone', e.target.value)} className={cls} placeholder="+91 98765 43210" /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">License Number</label>
              <input required value={form.license_number} onChange={(e) => h('license_number', e.target.value)} className={cls} /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select value={form.status} onChange={(e) => h('status', e.target.value)} className={cls}>
                <option value="available">Available</option>
                <option value="on_duty">On Duty</option>
                <option value="off_duty">Off Duty</option>
              </select></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Profile ID (Supabase UID)</label>
              <input value={form.profile_id} onChange={(e) => h('profile_id', e.target.value)} className={cls} placeholder="UUID from auth.users" /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Saving…' : 'Save Driver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
