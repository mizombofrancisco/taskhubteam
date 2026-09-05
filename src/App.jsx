import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Dashboard from '@/pages/Dashboard';
import MyWorkspace from '@/pages/MyWorkspace';
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
import Propostas from '@/pages/Propostas';
import MyTasks from '@/pages/MyTasks';
import RegistoHoras from '@/pages/RegistoHoras';
import Reports from '@/pages/Reports';
import Comunicacao from '@/pages/Comunicacao';
import Colaboradores from '@/pages/Colaboradores';
import RecursosHumanos from '@/pages/RecursosHumanos';
import Notifications from '@/pages/Notifications';
import Profile from '@/pages/Profile';
import AccountSettings from '@/pages/AccountSettings';
import ProjectCalendar from '@/pages/ProjectCalendar';
import Clients from '@/pages/Clients';
import ActivityFeed from '@/pages/ActivityFeed';
import TeamPerformance from '@/pages/TeamPerformance';
import BillingManagement from '@/pages/BillingManagement';
import Quadros from '@/pages/Quadros';
import QuadroDetail from '@/pages/QuadroDetail';
import Templates from '@/pages/Templates';
import { homeRouteForRole } from '@/lib/acura';

function RoleHome() {
  const { user } = useAuth();
  return <Navigate to={homeRouteForRole(user?.role)} replace />;
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          <Route path="/" element={<RoleHome />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/my-workspace" element={<MyWorkspace />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/new" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/propostas" element={<Propostas />} />
          <Route path="/my-tasks" element={<MyTasks />} />
          <Route path="/registo-horas" element={<RegistoHoras />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/comunicacao" element={<Comunicacao />} />
          <Route path="/colaboradores" element={<Colaboradores />} />
          <Route path="/recursos-humanos" element={<RecursosHumanos />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/account-settings" element={<AccountSettings />} />
          <Route path="/project-calendar" element={<ProjectCalendar />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/activity-feed" element={<ActivityFeed />} />
          <Route path="/team-performance" element={<TeamPerformance />} />
          <Route path="/billing-management" element={<BillingManagement />} />
          <Route path="/quadros" element={<Quadros />} />
          <Route path="/quadros/:id" element={<QuadroDetail />} />
          <Route path="/templates" element={<Templates />} />
          {/* Redirecionamentos de módulos consolidados */}
          <Route path="/timesheets" element={<Navigate to="/registo-horas" replace />} />
          <Route path="/time-tracking" element={<Navigate to="/registo-horas" replace />} />
          <Route path="/partners" element={<Navigate to="/comunicacao" replace />} />
          <Route path="/channels" element={<Navigate to="/comunicacao" replace />} />
          <Route path="/team" element={<Navigate to="/colaboradores" replace />} />
          <Route path="/admin/users" element={<Navigate to="/colaboradores" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App