import type { DeliveryPriority, DeliveryStatus, VehicleStatus } from '../types';

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatDateTime(iso: string) {
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

export function priorityColor(p: DeliveryPriority): string {
  return {
    low: 'bg-slate-100 text-slate-600',
    normal: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700',
  }[p] ?? 'bg-gray-100 text-gray-600';
}

export function priorityLabel(p: DeliveryPriority): string {
  return { low: 'Low', normal: 'Normal', high: 'High', urgent: '🔴 Urgent' }[p] ?? p;
}

export function deliveryStatusColor(s: DeliveryStatus): string {
  return {
    pending: 'bg-yellow-100 text-yellow-700',
    assigned: 'bg-blue-100 text-blue-700',
    picked_up: 'bg-indigo-100 text-indigo-700',
    in_transit: 'bg-purple-100 text-purple-700',
    delivered: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
  }[s] ?? 'bg-gray-100 text-gray-600';
}

export function vehicleStatusColor(s: VehicleStatus): string {
  return {
    available: 'bg-green-100 text-green-700',
    on_delivery: 'bg-blue-100 text-blue-700',
    maintenance: 'bg-orange-100 text-orange-700',
    out_of_service: 'bg-red-100 text-red-700',
  }[s] ?? 'bg-gray-100 text-gray-600';
}

export function vehicleStatusLabel(s: VehicleStatus): string {
  return {
    available: 'Available',
    on_delivery: 'On Delivery',
    maintenance: 'Maintenance',
    out_of_service: 'Out of Service',
  }[s] ?? s;
}

export function truncate(str: string, n = 40) {
  return str.length > n ? str.slice(0, n) + '…' : str;
}

export function classNames(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}
