import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/authStore';
import ForcedPasswordChangePage from '@/pages/ForcedPasswordChangePage';

export function ProtectedRoute() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const mustChangePassword = useAuthStore((state) => state.user?.mustChangePassword);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (mustChangePassword) {
        return <ForcedPasswordChangePage />;
    }

    return <Outlet />;
}
