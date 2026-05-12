import { Navigate, Route, Routes } from 'react-router-dom';
import { Login } from '@/features/auth/Login';
import { Register } from '@/features/auth/Register';
import { AcceptInvite } from '@/features/auth/AcceptInvite';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { AppShell } from '@/shared/layout/AppShell';
import { Dashboard } from '@/features/dashboard/Dashboard';
import { Settings } from '@/features/settings/Settings';
import { Team } from '@/features/team/Team';
import { Audit } from '@/features/audit/Audit';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/accept-invite" element={<AcceptInvite />} />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/team" element={<Team />} />
        <Route path="/audit" element={<Audit />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
