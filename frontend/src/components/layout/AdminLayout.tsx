import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Users, Package, Map, Route,
  Bot, FlaskConical, Bell, BarChart3, Settings, LogOut,
  Menu, X, ChevronRight, Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/admin/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/vehicles',    icon: Truck,            label: 'Vehicles' },
  { to: '/admin/drivers',     icon: Users,            label: 'Drivers' },
  { to: '/admin/deliveries',  icon: Package,          label: 'Deliveries' },
  { to: '/admin/map',         icon: Map,              label: 'Fleet Map' },
  { to: '/admin/optimization',icon: Route,            label: 'Optimization' },
  { to: '/admin/assistant',   icon: Bot,              label: 'AI Assistant' },
  { to: '/admin/scenarios',   icon: FlaskConical,     label: 'Scenarios' },
  { to: '/admin/alerts',      icon: Bell,             label: 'Alerts' },
  { to: '/admin/analytics',   icon: BarChart3,        label: 'Analytics' },
  { to: '/admin/settings',    icon: Settings,         label: 'Settings' },
];

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-[#0f1729] transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold text-white">SmartMove AI</span>
          <button
            className="ml-auto text-white/60 lg:hidden hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">
            Navigation
          </p>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors mb-0.5 ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              {profile?.full_name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-white">{profile?.full_name ?? 'Admin'}</p>
              <p className="truncate text-xs text-white/40">{profile?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="text-white/40 hover:text-white transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-4 shadow-sm">
          <button
            className="lg:hidden text-slate-500 hover:text-slate-700"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-1 text-sm text-slate-400">
            <span>Admin</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:inline text-sm font-medium text-slate-700">
              {profile?.full_name ?? 'Admin'}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              {profile?.full_name?.[0]?.toUpperCase() ?? 'A'}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

