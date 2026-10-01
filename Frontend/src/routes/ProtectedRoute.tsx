import { Navigate, Outlet } from 'react-router'
import { useAuthStore } from '@/stores/auth-store'

export function ProtectedRoute() {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
