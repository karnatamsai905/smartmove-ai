import { useEffect, useState } from 'react';
import {
  Package, MapPin, CheckCircle, Phone,
  Loader2, RefreshCw, ShieldAlert, X
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import { priorityColor, deliveryStatusColor } from '../../utils/helpers';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function DriverDashboard() {
  const { profile } = useAuth();
  const [driver, setDriver] = useState<any | null>(null);
  const [vehicle, setVehicle] = useState<any | null>(null);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [incidentForm, setIncidentForm] = useState({
    incident_type: 'breakdown',
    description: '',
  });
  const [submittingIncident, setSubmittingIncident] = useState(false);
  const { success, error, warning } = useToast();

  const fetchDriverDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/driver/dashboard');
      setDriver(res.data.driver);
      setVehicle(res.data.vehicle);
      setDeliveries(res.data.deliveries || []);
    } catch (e: any) {
      console.error('Failed to load driver dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverDashboard();
  }, []);

  const handleUpdateStatus = async (deliveryId: string, nextStatus: string) => {
    setUpdatingId(deliveryId);
    try {
      await api.post(`/api/driver/deliveries/${deliveryId}/status`, { new_status: nextStatus });
      success('Status Updated', `Delivery marked as ${nextStatus.replace('_', ' ')}.`);
      fetchDriverDashboard();
    } catch (err: any) {
      error('Update Failed', err.response?.data?.detail || err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingIncident(true);
    try {
      await api.post('/api/driver/incidents', incidentForm);
      warning('Incident Reported', 'Dispatcher has been notified. Assigned vehicle marked for recovery.');
      setShowIncidentModal(false);
      setIncidentForm({ incident_type: 'breakdown', description: '' });
      fetchDriverDashboard();
    } catch (err: any) {
      error('Report Failed', err.response?.data?.detail || err.message);
    } finally {
      setSubmittingIncident(false);
    }
  };

  const getNextAction = (status: string) => {
    switch (status) {
      case 'assigned':
        return { label: 'Pick Up Package', value: 'picked_up', color: 'bg-indigo-600 hover:bg-indigo-700' };
      case 'picked_up':
        return { label: 'Start Delivery (In Transit)', value: 'in_transit', color: 'bg-blue-600 hover:bg-blue-700' };
      case 'in_transit':
        return { label: 'Mark Delivered', value: 'delivered', color: 'bg-green-600 hover:bg-green-700' };
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0f1729] via-[#1a2540] to-blue-900 p-6 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs text-blue-300 font-medium tracking-wide uppercase">Driver Duty Portal</span>
            <h1 className="text-2xl font-bold mt-0.5">{profile?.full_name || driver?.full_name || 'Driver'}</h1>
            <p className="text-xs text-slate-300 mt-1">
              Vehicle: <strong className="text-white">{vehicle?.registration_number || 'Unassigned'}</strong> ({vehicle?.vehicle_type || 'Van'})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowIncidentModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-red-600/90 hover:bg-red-600 px-3.5 py-2 text-xs font-semibold text-white transition-all shadow-sm"
            >
              <ShieldAlert className="h-4 w-4" /> Report Breakdown / Delay
            </button>
            <button
              onClick={fetchDriverDashboard}
              className="flex items-center justify-center h-9 w-9 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Deliveries List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Your Assigned Deliveries</h2>
          <span className="text-xs font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200">
            {deliveries.length} Total Orders
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : deliveries.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No Active Deliveries"
            description="You do not have any pending orders assigned at the moment."
          />
        ) : (
          <div className="space-y-3">
            {deliveries.map((d, index) => {
              const action = getNextAction(d.status);
              const isDone = d.status === 'delivered';
              const isUpdating = updatingId === d.id;

              return (
                <div
                  key={d.id}
                  className={`rounded-xl bg-white border p-4 shadow-sm transition-all ${
                    isDone ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 font-bold text-xs text-slate-700 shrink-0">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{d.customer_name}</h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3 text-slate-400" /> {d.customer_phone}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${priorityColor(d.priority)}`}>
                        {d.priority}
                      </span>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${deliveryStatusColor(d.status)}`}>
                        {d.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-start gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{d.delivery_address}</span>
                  </div>

                  {d.package_weight && (
                    <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
                      <Package className="h-3 w-3" />
                      <span>{d.package_weight} kg package weight</span>
                      {d.notes && <span>· Note: {d.notes}</span>}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-2 pt-2 border-t border-slate-100">
                    {action && (
                      <button
                        onClick={() => handleUpdateStatus(d.id, action.value)}
                        disabled={isUpdating}
                        className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50 ${action.color}`}
                      >
                        {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        {action.label}
                      </button>
                    )}

                    {d.status !== 'delivered' && d.status !== 'failed' && (
                      <button
                        onClick={() => handleUpdateStatus(d.id, 'failed')}
                        disabled={isUpdating}
                        className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Mark Failed
                      </button>
                    )}

                    {isDone && (
                      <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                        <CheckCircle className="h-4 w-4" /> Delivered Successfully
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Incident Reporting Modal */}
      {showIncidentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-red-600 font-bold text-base">
                <ShieldAlert className="h-5 w-5" />
                Report Incident to Dispatch
              </div>
              <button onClick={() => setShowIncidentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleReportIncident} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Incident Type:</label>
                <select
                  value={incidentForm.incident_type}
                  onChange={(e) => setIncidentForm({ ...incidentForm, incident_type: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 p-2 text-sm outline-none focus:border-blue-500"
                >
                  <option value="breakdown">Vehicle Breakdown (Engine / Tire)</option>
                  <option value="delay">Severe Traffic Delay (Road Obstacle)</option>
                  <option value="road_closure">Road Closure / Flooding</option>
                  <option value="other">Other Operational Incident</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Details & Location Note:</label>
                <textarea
                  required
                  rows={3}
                  value={incidentForm.description}
                  onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                  placeholder="Describe vehicle issue or road obstruction in detail for dispatch..."
                  className="w-full rounded-lg border border-slate-200 p-2 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIncidentModal(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingIncident}
                  className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {submittingIncident ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Send Incident Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
