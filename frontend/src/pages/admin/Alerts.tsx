import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, Clock, Truck } from 'lucide-react';
import { supabase } from '../../services/supabase';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { formatDate } from '../../utils/helpers';

export default function AlertsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('incidents')
        .select('*, vehicles(registration_number), drivers(full_name)')
        .order('created_at', { ascending: false });
      setIncidents(data || []);
    } catch (e) {
      console.error('Failed to load incidents:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleResolve = async (id: string) => {
    await supabase.from('incidents').update({ status: 'resolved' }).eq('id', id);
    fetchIncidents();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operational Alerts & Incidents</h1>
          <p className="text-sm text-slate-500">
            Real-time notifications from drivers on breakdowns, road bottlenecks, and weather delays
          </p>
        </div>
        <button
          onClick={fetchIncidents}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
      ) : incidents.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-100 p-8 shadow-sm">
          <EmptyState
            icon={CheckCircle}
            title="All Systems Operational"
            description="No active incidents or roadside delays reported by drivers."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((inc) => {
            const isResolved = inc.status === 'resolved';
            return (
              <div
                key={inc.id}
                className={`rounded-xl border p-5 shadow-sm transition-all bg-white ${
                  isResolved ? 'border-slate-100 opacity-60' : 'border-red-200 bg-red-50/10'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                      isResolved ? 'bg-slate-100 text-slate-400' : 'bg-red-100 text-red-600'
                    }`}>
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm capitalize">
                          {inc.incident_type.replace('_', ' ')} Incident
                        </h3>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          isResolved ? 'bg-slate-100 text-slate-600' : 'bg-red-100 text-red-700'
                        }`}>
                          {inc.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 max-w-xl">{inc.description}</p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-3">
                        {inc.vehicles?.registration_number && (
                          <span className="flex items-center gap-1 font-medium text-slate-700">
                            <Truck className="h-3.5 w-3.5" /> {inc.vehicles.registration_number}
                          </span>
                        )}
                        {inc.drivers?.full_name && (
                          <span>Reported by: <strong>{inc.drivers.full_name}</strong></span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {formatDate(inc.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!isResolved && (
                    <button
                      onClick={() => handleResolve(inc.id)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Acknowledge & Resolve
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
