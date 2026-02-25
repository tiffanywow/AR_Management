import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import NotificationManager from '@/components/notifications/NotificationManager';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Login from '@/pages/Login';
import Signup from '@/pages/Signup';
import Dashboard from '@/pages/Dashboard';
import Members from '@/pages/Members';
import Broadcasting from '@/pages/Broadcasting';
import BroadcastingEnhanced from '@/pages/BroadcastingEnhanced';
import BroadcastingSMS from '@/pages/BroadcastingSMS';
import Polls from '@/pages/Polls';
import Communities from '@/pages/Communities';
import Campaigns from '@/pages/Campaigns';
import CampaignCreate from '@/pages/CampaignCreate';
import CampaignEdit from '@/pages/CampaignEdit';
import CampaignDetails from '@/pages/CampaignDetails';
import Adverts from '@/pages/Adverts';
import Settings from '@/pages/Settings';
import Finance from '@/pages/Finance';
import PaymentReconciliation from '@/pages/PaymentReconciliation';
import CampaignBudgets from '@/pages/CampaignBudgets';
import RevenueManagement from '@/pages/RevenueManagement';
import ExpenseManagement from '@/pages/ExpenseManagement';
import Donations from '@/pages/Donations';
import UserManagement from '@/pages/UserManagement';
import Calendar from '@/pages/Calendar';
import PartyManagement from '@/pages/PartyManagement';
import Store from '@/pages/Store';
import RegionalAuthority from '@/pages/RegionalAuthority';
import NotificationTest from '@/pages/NotificationTest';
import './App.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to="/" replace /> : <Signup />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="members" element={<Members />} />
        <Route path="communities" element={<Communities />} />
        <Route path="broadcasting" element={<BroadcastingEnhanced />} />
        <Route path="broadcasting-enhanced" element={<BroadcastingEnhanced />} />
        <Route path="broadcasting-sms" element={<BroadcastingSMS />} />
        <Route path="polls" element={<Polls />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="campaigns/create" element={<CampaignCreate />} />
        <Route path="campaigns/:id" element={<CampaignDetails />} />
        <Route path="campaigns/:id/edit" element={<CampaignEdit />} />
        <Route path="adverts" element={<Adverts />} />
        <Route path="finance" element={<Finance />} />
        <Route path="finance/reconciliation" element={<PaymentReconciliation />} />
        <Route path="finance/budgets" element={<CampaignBudgets />} />
        <Route path="finance/revenue" element={<RevenueManagement />} />
        <Route path="finance/expenses" element={<ExpenseManagement />} />
        <Route path="finance/donations" element={<Donations />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="party" element={<PartyManagement />} />
        <Route path="store" element={<Store />} />
        <Route path="regional-authority" element={<RegionalAuthority />} />
        <Route path="notification-test" element={<NotificationTest />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <NotificationManager>
          <div className="min-h-screen bg-gray-50">
            <AppRoutes />
            <Toaster />
          </div>
        </NotificationManager>
      </Router>
    </AuthProvider>
  );
}

export default App;