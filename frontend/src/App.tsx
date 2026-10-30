import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';
import ProtectedRoute from './components/common/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';
import DriverLayout from './components/layout/DriverLayout';

// Auth
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

// Admin
import Dashboard from './pages/admin/Dashboard';
import VehiclesPage from './pages/admin/Vehicles';
import DriversPage from './pages/admin/Drivers';
import DeliveriesPage from './pages/admin/Deliveries';
import MapPage from './pages/admin/MapPage';
import OptimizationPage from './pages/admin/Optimization';
import AssistantPage from './pages/admin/Assistant';
import ScenariosPage from './pages/admin/Scenarios';
import AlertsPage from './pages/admin/Alerts';
import AnalyticsPage from './pages/admin/Analytics';
import SettingsPage from './pages/admin/Settings';

// Driver
import DriverDashboard from './pages/driver/DriverDashboard';

function RoleRedirect() {
  // After login, redirect based on role — handled in ProtectedRoute
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<RoleRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Admin */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard"    element={<Dashboard />} />
              <Route path="vehicles"     element={<VehiclesPage />} />
              <Route path="drivers"      element={<DriversPage />} />
              <Route path="deliveries"   element={<DeliveriesPage />} />
              <Route path="map"          element={<MapPage />} />
              <Route path="optimization" element={<OptimizationPage />} />
              <Route path="assistant"    element={<AssistantPage />} />
              <Route path="scenarios"    element={<ScenariosPage />} />
              <Route path="alerts"       element={<AlertsPage />} />
              <Route path="analytics"    element={<AnalyticsPage />} />
              <Route path="settings"     element={<SettingsPage />} />
            </Route>

            {/* Driver */}
            <Route
              path="/driver"
              element={
                <ProtectedRoute requiredRole="driver">
                  <DriverLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DriverDashboard />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
