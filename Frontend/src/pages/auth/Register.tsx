import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { decodeJwtPayload } from '@/lib/jwt'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookOpen, User, Feather, Building2, Loader2 } from 'lucide-react'

// ==========================================
// 1. ĐỊNH NGHĨA KHUÔN KIỂM TRA DỮ LIỆU (VALIDATION)
// ==========================================
const schema = z
  .object({
    username: z.string().trim().min(3, 'Tối thiểu 3 ký tự').max(30, 'Tối đa 30 ký tự'),
    email: z.string().trim().email('Email không hợp lệ'),
    password: z.string().min(8, 'Tối thiểu 8 ký tự'),
    confirmPassword: z.string(),
    role: z.enum(['Reader', 'Author', 'Publisher']),
    organizationName: z.string().optional(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu nhập lại không khớp',
  })
  .refine((v) => {
    if (v.role === 'Publisher') {
      return !!v.organizationName && v.organizationName.trim().length >= 2;
    }
    return true;
  }, {
    path: ['organizationName'],
    message: 'Vui lòng nhập tên tổ chức/NXB (tối thiểu 2 ký tự)',
  })

type FormValues = z.infer<typeof schema>

export function Register() {
  const navigate = useNavigate()

  // ==========================================
  // 2. KẾT NỐI VỚI STATE GLOBAL (ZUSTAND STORE)
  // ==========================================
  const setAuth = useAuthStore((s) => s.setAuth)
  const user = useAuthStore((s) => s.user)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ 
    resolver: zodResolver(schema),
    defaultValues: { role: 'Reader' }
  })

  // Nếu user đã đăng nhập rồi -> Đá văng về trang chủ
  if (user) return <Navigate to="/" replace />

  // ==========================================
  // 3. XỬ LÝ KHI USER BẤM "ĐĂNG KÝ"
  // ==========================================
  const roleWatch = watch('role')

  const onSubmit = async (values: FormValues) => {
    setServerError(null)
    try {
      let response: any;
      if (values.role === 'Publisher') {
        response = await authService.registerPublisherExternal({
          username: values.username,
          email: values.email,
          password: values.password,
          organizationName: values.organizationName!,
        });
      } else {
        response = await authService.register({
          username: values.username,
          email: values.email,
          password: values.password,
          role: values.role,
        });
      }

      const { data } = response;
      const payload = decodeJwtPayload(data.accessToken)

      setAuth(data.accessToken, data.refreshToken, {
        id: payload.sub,
        role: payload.role,
        username: payload.username ?? values.username,
      })

      navigate('/', { replace: true })
    } catch (err) {
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

  const fields = [
    { name: 'username', label: 'Tên đăng nhập', type: 'text', auto: 'username', placeholder: 'VD: nguyenvan_a' },
    { name: 'email', label: 'Địa chỉ Email', type: 'email', auto: 'email', placeholder: 'VD: nguyen@example.com' },
    { name: 'password', label: 'Mật khẩu', type: 'password', auto: 'new-password', placeholder: '••••••••' },
    { name: 'confirmPassword', label: 'Nhập lại mật khẩu', type: 'password', auto: 'new-password', placeholder: '••••••••' },
  ] as const

  // ==========================================
  // 4. HIỂN THỊ GIAO DIỆN (UI)
  // ==========================================
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4 sm:p-8">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        
        {/* Logo / Icon */}
        <div className="flex justify-center mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BookOpen className="h-8 w-8" />
          </div>
        </div>
        
        {/* Tiêu đề */}
        <div className="mb-8 text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Tạo tài khoản
          </h1>
          <p className="text-sm text-muted-foreground">
            Đã có tài khoản?{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Đăng nhập
            </Link>
          </p>
        </div>

        {/* Card Form */}
        <div className="rounded-2xl border bg-card text-card-foreground shadow-sm p-6 sm:p-8">
          <Tabs
            defaultValue="Reader"
            onValueChange={(v) => {
              setServerError(null)
              setValue('role', v as 'Reader' | 'Author' | 'Publisher')
            }}
            className="flex flex-col w-full"
          >
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted p-1 rounded-xl">
              <TabsTrigger value="Reader" className="rounded-lg text-xs sm:text-sm">
                <User className="w-4 h-4 mr-0 sm:mr-2 mb-1 sm:mb-0" />
                <span className="hidden sm:inline">Người dùng</span>
              </TabsTrigger>
              <TabsTrigger value="Author" className="rounded-lg text-xs sm:text-sm">
                <Feather className="w-4 h-4 mr-0 sm:mr-2 mb-1 sm:mb-0" />
                <span className="hidden sm:inline">Tác giả</span>
              </TabsTrigger>
              <TabsTrigger value="Publisher" className="rounded-lg text-xs sm:text-sm">
                <Building2 className="w-4 h-4 mr-0 sm:mr-2 mb-1 sm:mb-0" />
                <span className="hidden sm:inline">NXB</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="Reader" className="text-center animate-in fade-in duration-300">
              <p className="text-sm text-muted-foreground mb-6">
                Tạo tài khoản để đọc truyện, theo dõi tác giả và tương tác.
              </p>
            </TabsContent>
            
            <TabsContent value="Author" className="text-center animate-in fade-in duration-300">
              <p className="text-sm text-muted-foreground mb-6">
                Đăng ký sáng tác, quản lý truyện và kết nối với độc giả.
              </p>
            </TabsContent>
            
            <TabsContent value="Publisher" className="text-center animate-in fade-in duration-300">
              <p className="text-sm text-muted-foreground mb-6">
                Đại diện phát hành và quản lý tác phẩm bản quyền.
              </p>
            </TabsContent>
          </Tabs>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <input type="hidden" {...register('role')} />
            
            {fields.map((f) => (
              <div key={f.name} className="space-y-2">
                <Label htmlFor={f.name} className="text-sm font-medium">
                  {f.label}
                </Label>
                <Input 
                  id={f.name} 
                  type={f.type} 
                  autoComplete={f.auto}
                  placeholder={f.placeholder}
                  className="h-10 rounded-lg"
                  {...register(f.name)} 
                />
                {errors[f.name] && (
                  <p className="text-xs text-destructive font-medium animate-in slide-in-from-top-1">
                    {errors[f.name]?.message}
                  </p>
                )}
              </div>
            ))}

            {roleWatch === 'Publisher' && (
              <div className="space-y-2 mt-4 p-4 rounded-xl bg-muted/50 border animate-in slide-in-from-top-2 duration-300">
                <Label htmlFor="organizationName" className="text-sm font-medium">
                  Tên Tổ chức / Nhà xuất bản
                </Label>
                <Input 
                  id="organizationName" 
                  type="text" 
                  placeholder="VD: NXB Kim Đồng..." 
                  className="h-10 rounded-lg bg-background"
                  {...register('organizationName')} 
                />
                {errors.organizationName && (
                  <p className="text-xs text-destructive font-medium animate-in slide-in-from-top-1">
                    {errors.organizationName.message}
                  </p>
                )}
                <p className="text-[13px] text-muted-foreground mt-2">
                  Lưu ý: Bạn có thể cần cung cấp giấy phép hoạt động sau khi đăng ký để được phê duyệt.
                </p>
              </div>
            )}

            {serverError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive font-medium">{serverError}</p>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-11 text-base font-semibold mt-6 rounded-xl" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Đang xử lý...
                </>
              ) : (
                'Tạo tài khoản'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Register

