import { useEffect, useState } from 'react';
import { Plus, Search, Package, Pencil, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../../services/supabase';
import type { Delivery, DeliveryPriority, DeliveryStatus } from '../../types';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { priorityColor, priorityLabel, deliveryStatusColor, truncate } from '../../utils/helpers';

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<DeliveryPriority | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Delivery | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase.from('deliveries').select('*').order('created_at', { ascending: false });
    setDeliveries(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const filtered = deliveries.filter((d) => {
    const s = search.toLowerCase();
    const matchSearch = d.customer_name.toLowerCase().includes(s) || d.delivery_address.toLowerCase().includes(s);
    return matchSearch
      && (statusFilter ? d.status === statusFilter : true)
      && (priorityFilter ? d.priority === priorityFilter : true);
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await supabase.from('deliveries').delete().eq('id', deleteId);
    setDeleteId(null);
    setDeleting(false);
    fetch();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Deliveries</h1>
          <p className="text-sm text-slate-500">Manage and track all delivery orders</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 shadow-sm"
        >
          <Plus className="h-4 w-4" /> Create Delivery
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer or address…"
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm outline-none focus:border-blue-500" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as DeliveryStatus | '')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
          <option value="">All Statuses</option>
          {['pending','assigned','picked_up','in_transit','delivered','failed','cancelled'].map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as DeliveryPriority | '')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      <div className="rounded-xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Package} title="No deliveries found"
            description="Create your first delivery order to get started."
            action={<button onClick={() => { setEditing(null); setShowForm(true); }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">Create Delivery</button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Customer', 'Address', 'Weight (kg)', 'Priority', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{d.customer_name}</div>
                      <div className="text-xs text-slate-400">{d.customer_phone}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs">{truncate(d.delivery_address, 45)}</td>
                    <td className="px-4 py-3 text-slate-600">{d.package_weight}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityColor(d.priority)}`}>
                        {priorityLabel(d.priority)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${deliveryStatusColor(d.status)}`}>
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
        <DeliveryForm delivery={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetch(); }} />
      )}
      <ConfirmDialog open={!!deleteId} title="Delete Delivery" message="Delete this delivery? This cannot be undone."
        confirmLabel="Delete" variant="danger" loading={deleting} onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}

function DeliveryForm({ delivery, onClose, onSaved }: { delivery: Delivery | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    customer_name: delivery?.customer_name ?? '',
    customer_phone: delivery?.customer_phone ?? '',
    delivery_address: delivery?.delivery_address ?? '',
    lat: delivery?.lat ?? 13.0827,
    lng: delivery?.lng ?? 80.2707,
    package_weight: delivery?.package_weight ?? 1,
    priority: delivery?.priority ?? 'normal',
    notes: delivery?.notes ?? '',
    status: delivery?.status ?? 'pending',
  });
  const [geocoding, setGeocoding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const h = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));
  const cls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  const geocode = async () => {
    if (!form.delivery_address.trim()) return;
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.delivery_address)}&limit=1`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'SmartMoveAI/1.0' } }
      );
      const data = await res.json();
      if (data.length > 0) {
        setForm((f) => ({ ...f, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }));
      } else {
        setError('Address not found. Please enter coordinates manually.');
      }
    } catch {
      setError('Geocoding unavailable. Please enter coordinates manually.');
    } finally {
      setGeocoding(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (delivery) {
        const { error: err } = await supabase.from('deliveries').update(form).eq('id', delivery.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('deliveries').insert(form);
        if (err) throw err;
      }
      onSaved();
    } catch (err: unknown) { setError((err as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 sticky top-0 bg-white">
          <h3 className="font-semibold text-slate-900">{delivery ? 'Edit Delivery' : 'Create Delivery'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Customer Name</label>
              <input required value={form.customer_name} onChange={(e) => h('customer_name', e.target.value)} className={cls} /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Customer Phone</label>
              <input required value={form.customer_phone} onChange={(e) => h('customer_phone', e.target.value)} className={cls} placeholder="+91 98765 43210" /></div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Delivery Address</label>
            <div className="flex gap-2">
              <input required value={form.delivery_address} onChange={(e) => h('delivery_address', e.target.value)}
                className={cls} placeholder="123 Anna Salai, Chennai, Tamil Nadu" />
              <button type="button" onClick={geocode} disabled={geocoding}
                className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1">
                {geocoding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {geocoding ? 'Geocoding…' : 'Geocode'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Latitude</label>
              <input type="number" step="any" required value={form.lat} onChange={(e) => h('lat', parseFloat(e.target.value))} className={cls} /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Longitude</label>
              <input type="number" step="any" required value={form.lng} onChange={(e) => h('lng', parseFloat(e.target.value))} className={cls} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Weight (kg)</label>
              <input type="number" step="0.1" min={0.1} required value={form.package_weight}
                onChange={(e) => h('package_weight', parseFloat(e.target.value))} className={cls} /></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Priority</label>
              <select value={form.priority} onChange={(e) => h('priority', e.target.value)} className={cls}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">🔴 Urgent</option>
              </select></div>
            <div><label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select value={form.status} onChange={(e) => h('status', e.target.value)} className={cls}>
                {['pending','assigned','picked_up','in_transit','delivered','failed','cancelled'].map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select></div>
          </div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => h('notes', e.target.value)}
              className={cls + ' resize-none'} rows={2} placeholder="Special delivery instructions…" /></div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Saving…' : delivery ? 'Update Delivery' : 'Create Delivery'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
