import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { api } from '@/lib/api'
import { decodeJwtPayload } from '@/lib/jwt'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { LoginDto, LoginResponse } from '@/types/auth'

// ==========================================
// 1. ĐỊNH NGHĨA KHUÔN KIỂM TRA DỮ LIỆU (VALIDATION)
// ==========================================
// Sử dụng Zod để bắt buộc user phải nhập đúng định dạng.
// Nếu user để trống, thư viện sẽ tự động hiện thông báo lỗi tương ứng.
const schema = z.object({
  usernameOrEmail: z.string().trim().min(1, 'Nhập tên đăng nhập hoặc email'),
  password: z.string().min(1, 'Nhập mật khẩu'),
})

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  
  // ==========================================
  // 2. KẾT NỐI VỚI STATE GLOBAL (ZUSTAND STORE)
  // ==========================================
  // Lấy hàm setAuth để lưu token sau khi đăng nhập thành công
  // Lấy user để biết hiện tại đã đăng nhập chưa
  const setAuth = useAuthStore((s) => s.setAuth)
  const user = useAuthStore((s) => s.user)
  const [serverError, setServerError] = useState<string | null>(null)

  // ==========================================
  // 3. XÁC ĐỊNH ĐƯỜNG DẪN TRẢ VỀ (REDIRECT PATH)
  // ==========================================
  // Đọc state `from` do ProtectedRoute gửi tới (nếu có). 
  // Nếu user tự bấm vào /login thì sẽ trả về trang chủ '/'.
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'

  // Khởi tạo thư viện quản lý form (react-hook-form) tích hợp chung với Zod
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginDto>({ resolver: zodResolver(schema) })

  // Nếu user đã đăng nhập rồi mà lỡ bấm vào trang /login -> Đá văng về trang đích luôn
  if (user) return <Navigate to={from} replace />

  // ==========================================
  // 4. XỬ LÝ KHI USER BẤM "ĐĂNG NHẬP"
  // ==========================================
  const onSubmit = async (values: LoginDto) => {
    setServerError(null)
    try {
      // 4.1. Gửi dữ liệu (username, password) lên Backend
      const { data } = await api.post<LoginResponse>('/auth/login', values)
      
      // 4.2. Giải mã trực tiếp accessToken lấy từ Backend trả về
      // Mục đích: Ép ra được `username`, `role`, `sub` (tức là id) mà không cần gọi API lần 2
      const payload = decodeJwtPayload(data.accessToken)
      
      // 4.3. Lưu vào Global State (Zustand sẽ tự động lưu vào LocalStorage luôn)
      setAuth(data.accessToken, data.refreshToken, {
        id: payload.sub,
        role: payload.role,
        username: payload.username,
      })
      
      // 4.4. Đăng nhập thành công! Đưa user về trang họ định vào ban nãy
      navigate(from, { replace: true })
    } catch (err) {
      // Bắt lỗi từ Backend (Sai pass, khóa tài khoản...)
      const status = isAxiosError(err) ? err.response?.status : undefined
      setServerError(
        status === 401 || status === 400
          ? 'Sai tài khoản hoặc mật khẩu.'
          : 'Không kết nối được máy chủ. Thử lại sau.',
      )
    }
  }

  // ==========================================
  // 5. HIỂN THỊ GIAO DIỆN (UI)
  // ==========================================
  return (
    <div className="mx-auto w-full max-w-sm space-y-6 py-10">
      <h1 className="text-2xl font-bold">Đăng nhập</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Trường nhập Username / Email */}
        <div className="space-y-1.5">
          <Label htmlFor="usernameOrEmail">Tên đăng nhập hoặc email</Label>
          <Input id="usernameOrEmail" autoComplete="username" {...register('usernameOrEmail')} />
          {errors.usernameOrEmail && (
            <p className="text-xs text-red-600">{errors.usernameOrEmail.message}</p>
          )}
        </div>
        
        {/* Trường nhập Mật khẩu */}
        <div className="space-y-1.5">
          <Label htmlFor="password">Mật khẩu</Label>
          <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
          {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
        </div>
        
        {/* Hiển thị lỗi từ Backend */}
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        
        {/* Nút Submit (Tự động mờ đi khi đang tải) */}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </Button>
      </form>
      
      {/* Nút Đăng ký nếu chưa có tài khoản */}
      <p className="text-center text-sm text-muted-foreground">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="underline underline-offset-4">
          Đăng ký
        </Link>
      </p>
    </div>
  )
}

export default Login
