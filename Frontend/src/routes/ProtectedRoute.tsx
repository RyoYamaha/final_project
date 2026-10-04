import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuthStore } from '@/stores/auth-store'

export function ProtectedRoute() {
  // ==========================================
  // 1. KIỂM TRA TRẠNG THÁI ĐĂNG NHẬP
  // ==========================================
  // Lấy cờ isAuthenticated từ Zustand store để biết user đã đăng nhập chưa
  const { isAuthenticated } = useAuthStore()
  
  // hook useLocation lấy thông tin về đường dẫn hiện tại (ví dụ: user đang cố vào /inbox)
  const location = useLocation()

  // ==========================================
  // 2. CHUYỂN HƯỚNG THÔNG MINH NẾU CHƯA ĐĂNG NHẬP
  // ==========================================
  if (!isAuthenticated) {
    // Nếu chưa đăng nhập, đá văng về trang /login.
    // NHƯNG: Gửi kèm state={{ from: location }}. 
    // Mẹo này giúp trang Login biết user vừa bị văng ra từ đâu để lát nữa đăng nhập xong đẩy về lại chỗ cũ.
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // ==========================================
  // 3. CHO PHÉP ĐI TIẾP NẾU ĐÃ ĐĂNG NHẬP
  // ==========================================
  // Outlet đại diện cho các route con nằm bên trong ProtectedRoute ở file router.tsx
  return <Outlet />
}
