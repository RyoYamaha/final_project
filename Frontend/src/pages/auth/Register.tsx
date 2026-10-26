import { useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { decodeJwtPayload } from '@/lib/jwt'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/auth-store'
import type { User as UserProfile } from '@/types/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, Feather, Building2, Loader2, FileText, ImagePlus, X } from 'lucide-react'

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
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const user = useAuthStore((s) => s.user)
  const [serverError, setServerError] = useState<string | null>(null)
  const [verificationFile, setVerificationFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const verificationInputRef = useRef<HTMLInputElement>(null)

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
    if (values.role === 'Publisher' && !verificationFile) {
      setFileError('Vui lòng chụp ảnh hoặc chọn giấy tờ xác minh của tổ chức.')
      return
    }

    try {
      let response;
      if (values.role === 'Publisher') {
        response = await authService.registerPublisherExternal({
          username: values.username,
          email: values.email,
          password: values.password,
          organizationName: values.organizationName!,
        }, verificationFile!);
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

      let profile: UserProfile | undefined
      if (values.role === 'Reader') {
        setAccessToken(data.accessToken)
        try {
          profile = (await authService.me()).data
        } catch (error) {
          clearAuth()
          throw error
        }
      }
      setAuth(data.accessToken, data.refreshToken, {
        ...profile,
        id: payload.sub,
        role: payload.role,
        username: payload.username ?? values.username,
      })

      navigate(
        values.role === 'Publisher'
          ? '/publisher/status'
          : values.role === 'Reader'
            ? '/onboarding'
            : '/',
        { replace: true },
      )
    } catch (err) {
      const status = isAxiosError(err) ? err.response?.status : undefined
      setServerError(
        status === 409
          ? 'Tên đăng nhập hoặc email đã được sử dụng.'
          : status === 413
            ? 'Tệp quá lớn. Vui lòng chọn tệp tối đa 10 MB.'
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
    <div className="w-full max-w-md py-4">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
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
                  Đính kèm giấy tờ xác minh trong bước đăng ký. Admin sẽ kiểm tra hồ sơ trước khi phê duyệt tài khoản Publisher.
                </p>
                <div className="space-y-2 pt-2 text-left">
                  <Label htmlFor="publisherVerificationFile" className="text-sm font-medium">
                    Giấy tờ xác minh tổ chức
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Chụp ảnh giấy phép hoặc tải ảnh JPEG/PNG/WebP hay tệp PDF lên (tối đa 10 MB).
                  </p>
                  <Input
                    id="publisherVerificationFile"
                    ref={verificationInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    capture="environment"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null
                      setVerificationFile(file)
                      setFileError(null)
                      setServerError(null)
                      if (file && file.size > 10 * 1024 * 1024) {
                        setVerificationFile(null)
                        setFileError('Tệp quá lớn. Vui lòng chọn tệp tối đa 10 MB.')
                        event.target.value = ''
                      }
                    }}
                  />
                  {verificationFile && (
                    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background p-3">
                      <div className="flex min-w-0 items-center gap-2">
                        {verificationFile.type === 'application/pdf'
                          ? <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          : <ImagePlus className="h-4 w-4 shrink-0 text-muted-foreground" />}
                        <span className="truncate text-sm">{verificationFile.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {(verificationFile.size / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Bỏ tệp xác minh"
                        onClick={() => {
                          setVerificationFile(null)
                          if (verificationInputRef.current) verificationInputRef.current.value = ''
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {fileError && <p className="text-xs text-destructive">{fileError}</p>}
                </div>
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
