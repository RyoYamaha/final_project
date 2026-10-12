import { Navigate } from 'react-router'
import { useAuthStore } from '@/stores/auth-store'
import { MainLayout } from './MainLayout'

export const PublisherLayout = () => {
  const user = useAuthStore((s) => s.user)
  if (user?.role !== 'Publisher' && user?.role !== 'Admin') return <Navigate to="/" replace />
  return <MainLayout />
}
export default PublisherLayout
