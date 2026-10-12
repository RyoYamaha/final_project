import { Navigate, Outlet } from 'react-router'
import { useAuthStore } from '@/stores/auth-store'

export function AdminRoute() {
  const user = useAuthStore((s) => s.user)
  if (user?.role !== 'Admin') return <Navigate to="/" replace />
  return <Outlet />
}
export default AdminRoute
