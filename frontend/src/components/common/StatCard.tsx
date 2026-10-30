import { type LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'slate';
  trend?: number; // percent change, positive = up
  subtitle?: string;
}

const colorMap = {
  blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-500',   text: 'text-blue-600' },
  green:  { bg: 'bg-green-50',  icon: 'bg-green-500',  text: 'text-green-600' },
  orange: { bg: 'bg-orange-50', icon: 'bg-orange-500', text: 'text-orange-600' },
  red:    { bg: 'bg-red-50',    icon: 'bg-red-500',    text: 'text-red-600' },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-500', text: 'text-purple-600' },
  slate:  { bg: 'bg-slate-50',  icon: 'bg-slate-500',  text: 'text-slate-600' },
};

export default function StatCard({ title, value, icon: Icon, color = 'blue', trend, subtitle }: Props) {
  const c = colorMap[color];
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
          <p className="mt-1.5 text-2xl font-bold text-slate-900">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.icon}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          {trend > 0 ? (
            <><TrendingUp className="h-3.5 w-3.5 text-green-500" /><span className="text-green-600 font-medium">+{trend}%</span></>
          ) : trend < 0 ? (
            <><TrendingDown className="h-3.5 w-3.5 text-red-500" /><span className="text-red-600 font-medium">{trend}%</span></>
          ) : (
            <><Minus className="h-3.5 w-3.5 text-slate-400" /><span className="text-slate-400">No change</span></>
          )}
          <span className="text-slate-400">vs last period</span>
        </div>
      )}
    </div>
  );
}

