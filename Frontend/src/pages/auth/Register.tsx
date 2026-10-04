import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
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
import type { LoginResponse } from '@/types/auth'

// ==========================================
// 1. ĐỊNH NGHĨA KHUÔN KIỂM TRA DỮ LIỆU (VALIDATION)
// ==========================================
// Sử dụng Zod để bắt buộc user phải nhập đúng định dạng và khớp mật khẩu.
// Nếu không hợp lệ, thư viện sẽ tự động hiện thông báo lỗi tương ứng.
const schema = z
  .object({
    username: z.string().trim().min(3, 'Tối thiểu 3 ký tự').max(30, 'Tối đa 30 ký tự'),
    email: z.string().trim().email('Email không hợp lệ'),
    password: z.string().min(8, 'Tối thiểu 8 ký tự'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu nhập lại không khớp',
  })

type FormValues = z.infer<typeof schema>

export function Register() {
  const navigate = useNavigate()

  // ==========================================
  // 2. KẾT NỐI VỚI STATE GLOBAL (ZUSTAND STORE)
  // ==========================================
  // Lấy hàm setAuth để tự động lưu token và đăng nhập sau khi tạo tài khoản thành công
  // Lấy user để biết hiện tại đã đăng nhập chưa
  const setAuth = useAuthStore((s) => s.setAuth)
  const user = useAuthStore((s) => s.user)
  const [serverError, setServerError] = useState<string | null>(null)

  // Khởi tạo thư viện quản lý form (react-hook-form) tích hợp chung với Zod
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  // Nếu user đã đăng nhập rồi mà lỡ bấm vào trang /register -> Đá văng về trang chủ luôn
  if (user) return <Navigate to="/" replace />

  // ==========================================
  // 3. XỬ LÝ KHI USER BẤM "ĐĂNG KÝ"
  // ==========================================
  const onSubmit = async ({ username, email, password }: FormValues) => {
    setServerError(null)
    try {
      // 3.1. Gửi dữ liệu đăng ký (username, email, password) lên Backend
      const { data } = await api.post<LoginResponse>('/auth/register', { username, email, password })

      // 3.2. Giải mã trực tiếp accessToken lấy từ Backend trả về
      // Mục đích: Ép ra được `username`, `role`, `sub` (tức là id) mà không cần gọi API lần 2
      const payload = decodeJwtPayload(data.accessToken)

      // 3.3. Lưu vào Global State (Tự động đăng nhập luôn sau khi đăng ký thành công)
      setAuth(data.accessToken, data.refreshToken, {
        id: payload.sub,
        role: payload.role,
        username: payload.username ?? username,
      })

      // 3.4. Đăng ký thành công! Đưa user về trang chủ
      navigate('/', { replace: true })
    } catch (err) {
      // Bắt lỗi từ Backend (Trùng tên/email 409, dữ liệu không hợp lệ 400...)
      const status = isAxiosError(err) ? err.response?.status : undefined
      setServerError(
        status === 409
          ? 'Tên đăng nhập hoặc email đã được sử dụng.'
          : status === 400
            ? 'Thông tin không hợp lệ.'
            : 'Không kết nối được máy chủ. Thử lại sau.',
      )
    }
  }

  // Cấu hình các trường nhập dữ liệu để render lặp qua form
  const fields = [
    { name: 'username', label: 'Tên đăng nhập', type: 'text', auto: 'username' },
    { name: 'email', label: 'Email', type: 'email', auto: 'email' },
    { name: 'password', label: 'Mật khẩu', type: 'password', auto: 'new-password' },
    { name: 'confirmPassword', label: 'Nhập lại mật khẩu', type: 'password', auto: 'new-password' },
  ] as const

  // ==========================================
  // 4. HIỂN THỊ GIAO DIỆN (UI)
  // ==========================================
  return (
    <div className="mx-auto w-full max-w-sm space-y-6 py-10">
      <h1 className="text-2xl font-bold">Đăng ký</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Render danh sách các ô nhập liệu (Username, Email, Mật khẩu, Nhập lại mật khẩu) */}
        {fields.map((f) => (
          <div key={f.name} className="space-y-1.5">
            <Label htmlFor={f.name}>{f.label}</Label>
            <Input id={f.name} type={f.type} autoComplete={f.auto} {...register(f.name)} />
            {errors[f.name] && <p className="text-xs text-red-600">{errors[f.name]?.message}</p>}
          </div>
        ))}

        {/* Hiển thị lỗi từ Backend */}
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        {/* Nút Submit (Tự động mờ đi khi đang tải) */}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Đang tạo tài khoản...' : 'Đăng ký'}
        </Button>
      </form>

      {/* Nút Đăng nhập nếu đã có tài khoản */}
      <p className="text-center text-sm text-muted-foreground">
        Đã có tài khoản?{' '}
        <Link to="/login" className="underline underline-offset-4">
          Đăng nhập
        </Link>
      </p>
    </div>
  )
}

export default Register
