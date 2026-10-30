import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Delivery, Vehicle } from '../../types';

// Custom colored SVG pin markers to avoid broken image URLs
const createPinIcon = (color: string, label?: string) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="28" height="42">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24c0-6.63-5.37-12-12-12z" fill="${color}" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="5" fill="#ffffff"/>
      ${label ? `<text x="12" y="15" font-size="8" font-weight="bold" fill="${color}" text-anchor="middle">${label}</text>` : ''}
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: 'custom-leaflet-pin',
    iconSize: [28, 42],
    iconAnchor: [14, 42],
    popupAnchor: [0, -38],
  });
};

const createVehicleIcon = (_type: string, color: string) => {
  const svg = `
    <div style="background-color: ${color}; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 2px solid white;">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="3" width="15" height="13"></rect>
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
        <circle cx="5.5" cy="18.5" r="2.5"></circle>
        <circle cx="18.5" cy="18.5" r="2.5"></circle>
      </svg>
    </div>
  `;
  return L.divIcon({
    html: svg,
    className: 'custom-vehicle-icon',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
};

const createWarehouseIcon = () => {
  const svg = `
    <div style="background-color: #0f1729; width: 38px; height: 38px; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(0,0,0,0.4); border: 2px solid white;">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
    </div>
  `;
  return L.divIcon({
    html: svg,
    className: 'custom-warehouse-icon',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -19],
  });
};

const ROUTE_COLORS = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#dc2626', '#0891b2'];

// Map auto-fitter component
function MapBoundsFitter({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [points, map]);
  return null;
}

interface FleetMapProps {
  warehouse: { name: string; lat: number; lng: number };
  vehicles?: Vehicle[];
  deliveries?: Delivery[];
  routes?: Array<{
    vehicle_id: string;
    registration_number: string;
    geometry?: [number, number][]; // [lng, lat] from OSRM GeoJSON
    stops?: Array<{ lat: number; lng: number; stop_sequence: number; customer_name?: string }>;
  }>;
  height?: string;
  selectedVehicleId?: string | null;
}

export default function FleetMap({
  warehouse,
  vehicles = [],
  deliveries = [],
  routes = [],
  height = '520px',
  selectedVehicleId,
}: FleetMapProps) {
  // Collect all points to auto-fit
  const allPoints: [number, number][] = [
    [warehouse.lat, warehouse.lng],
    ...vehicles.filter(v => v.current_lat && v.current_lng).map(v => [v.current_lat!, v.current_lng!] as [number, number]),
    ...deliveries.filter(d => d.lat && d.lng).map(d => [d.lat, d.lng] as [number, number]),
  ];

  return (
    <div className="relative w-full rounded-xl overflow-hidden shadow-sm border border-slate-200 z-0">
      <MapContainer
        center={[warehouse.lat, warehouse.lng]}
        zoom={12}
        style={{ height, width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBoundsFitter points={allPoints} />

        {/* Warehouse Marker */}
        <Marker position={[warehouse.lat, warehouse.lng]} icon={createWarehouseIcon()}>
          <Popup>
            <div className="p-1">
              <span className="font-bold text-slate-900 block text-sm">🏢 {warehouse.name}</span>
              <span className="text-xs text-slate-500">Central Dispatch Hub</span>
              <div className="text-[11px] text-blue-600 mt-1">Lat: {warehouse.lat}, Lng: {warehouse.lng}</div>
            </div>
          </Popup>
        </Marker>

        {/* Vehicles */}
        {vehicles.map((v, i) => {
          if (!v.current_lat || !v.current_lng) return null;
          const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
          return (
            <Marker
              key={v.id}
              position={[v.current_lat, v.current_lng]}
              icon={createVehicleIcon(v.vehicle_type, color)}
            >
              <Popup>
                <div className="p-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
                    <span>🚚</span> {v.registration_number}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">Type: <span className="capitalize font-medium">{v.vehicle_type}</span></div>
                  <div className="text-xs text-slate-600">Capacity: <span className="font-medium">{v.max_capacity} kg</span></div>
                  <div className="text-xs text-slate-600">Status: <span className="font-medium capitalize">{v.status.replace('_', ' ')}</span></div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Deliveries */}
        {deliveries.map((d) => {
          if (!d.lat || !d.lng) return null;
          const pinColor = d.priority === 'urgent' ? '#dc2626'
            : d.priority === 'high' ? '#ea580c'
            : d.priority === 'normal' ? '#2563eb' : '#64748b';

          return (
            <Marker key={d.id} position={[d.lat, d.lng]} icon={createPinIcon(pinColor)}>
              <Popup>
                <div className="p-1 max-w-[200px]">
                  <div className="font-bold text-slate-900 text-xs">{d.customer_name}</div>
                  <div className="text-[11px] text-slate-600 mt-0.5">{d.delivery_address}</div>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 text-[11px]">
                    <span className="font-semibold text-slate-700">{d.package_weight} kg</span>
                    <span className="capitalize font-medium px-1.5 py-0.5 rounded text-[10px]" style={{ backgroundColor: `${pinColor}20`, color: pinColor }}>
                      {d.priority}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">Status: {d.status}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* OSRM Route Polylines */}
        {routes.map((r, i) => {
          const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
          const isSelected = selectedVehicleId ? selectedVehicleId === r.vehicle_id : true;
          const opacity = isSelected ? 0.85 : 0.25;
          const weight = isSelected ? 4 : 2;

          // OSRM GeoJSON is [lng, lat] -> convert to Leaflet [lat, lng]
          const polylineCoords: [number, number][] = (r.geometry || []).map(
            ([lng, lat]) => [lat, lng] as [number, number]
          );

          if (polylineCoords.length === 0 && r.stops) {
            // Fallback to stop straight line coords
            r.stops.forEach(s => polylineCoords.push([s.lat, s.lng]));
          }

          if (polylineCoords.length < 2) return null;

          return (
            <Polyline
              key={r.vehicle_id}
              positions={polylineCoords}
              pathOptions={{
                color,
                weight,
                opacity,
                dashArray: isSelected ? undefined : '5, 8',
              }}
            >
              <Popup>
                <div className="p-1">
                  <div className="font-bold text-xs" style={{ color }}>{r.registration_number} Route</div>
                  <div className="text-[11px] text-slate-600 mt-0.5">Stops: {r.stops?.length || 0}</div>
                </div>
              </Popup>
            </Polyline>
          );
        })}
      </MapContainer>

      {/* Map Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg p-2.5 shadow-md border border-slate-200 text-xs">
        <p className="font-bold text-slate-800 mb-1.5 text-[11px]">Map Legend</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-600 shrink-0"></span>
            <span className="text-slate-600">Urgent Delivery</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0"></span>
            <span className="text-slate-600">Normal Delivery</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-slate-900 shrink-0"></span>
            <span className="text-slate-600">Central Warehouse</span>
          </div>
        </div>
      </div>
    </div>
  );
}
