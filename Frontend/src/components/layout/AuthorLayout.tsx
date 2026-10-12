import { Navigate } from 'react-router'
import { useAuthStore } from '@/stores/auth-store'
import { MainLayout } from './MainLayout'

export const AuthorLayout = () => {
  const user = useAuthStore((s) => s.user)
  // Optionally check if they are Author
  if (user?.role !== 'Author' && user?.role !== 'Admin') return <Navigate to="/" replace />
  
  return <MainLayout />
}
export default AuthorLayout
