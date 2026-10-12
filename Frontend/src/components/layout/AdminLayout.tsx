import { Navigate } from 'react-router'
import { useAuthStore } from '@/stores/auth-store'
import { MainLayout } from './MainLayout'

export const AdminLayout = () => {
  const user = useAuthStore((s) => s.user)
  if (user?.role !== 'Admin') return <Navigate to="/" replace />
  return <MainLayout />
}
export default AdminLayout
