import { useEffect, useState } from 'react';
import { RefreshCw, Navigation } from 'lucide-react';
import { supabase } from '../../services/supabase';
import FleetMap from '../../components/map/FleetMap';
import type { Delivery, Vehicle } from '../../types';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function MapPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

  const warehouse = {
    name: 'Chennai Central Warehouse',
    lat: 13.0827,
    lng: 80.2707,
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vRes, dRes] = await Promise.all([
        supabase.from('vehicles').select('*'),
        supabase.from('deliveries').select('*'),
      ]);
      setVehicles(vRes.data || []);
      setDeliveries(dRes.data || []);
    } catch (e) {
      console.error('Failed to load fleet map data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fleet Map</h1>
          <p className="text-sm text-slate-500">
            Real-time interactive map of Chennai warehouse, fleet vehicles, and delivery locations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Map Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-sm">
        <div className="flex items-center gap-2">
          <Navigation className="h-4 w-4 text-blue-600" />
          <span className="font-semibold text-slate-700">Filter Vehicle Route:</span>
          <select
            value={selectedVehicle || ''}
            onChange={(e) => setSelectedVehicle(e.target.value || null)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs outline-none focus:border-blue-500"
          >
            <option value="">All Vehicles</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.registration_number} ({v.vehicle_type})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>Active Vehicles: <strong className="text-slate-800">{vehicles.length}</strong></span>
          <span>Pending Deliveries: <strong className="text-slate-800">{deliveries.length}</strong></span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[520px] bg-white rounded-xl border border-slate-100">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <FleetMap
          warehouse={warehouse}
          vehicles={vehicles}
          deliveries={deliveries}
          height="560px"
          selectedVehicleId={selectedVehicle}
        />
      )}
    </div>
  );
}
