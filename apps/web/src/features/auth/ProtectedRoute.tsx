import { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/state/auth-store';
import { api } from '@/shared/api/client';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { accessToken, user, setUser, clear } = useAuthStore();

  useEffect(() => {
    if (accessToken && !user) {
      api
        .get('/auth/me')
        .then((r) => {
          setUser({
            id: r.data.id,
            email: r.data.email,
            name: r.data.name,
            role: r.data.role,
            organizationId: r.data.organizationId,
          });
        })
        .catch(() => clear());
    }
  }, [accessToken, user, setUser, clear]);

  if (!accessToken) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
