import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { FileText, ImagePlus, X } from 'lucide-react'
import { publisherService } from '@/services/publisher.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ==========================================
// 1. ĐỊNH NGHĨA KHUÔN KIỂM TRA DỮ LIỆU (VALIDATION)
// ==========================================
// Sử dụng Zod để bắt buộc user phải nhập đúng định dạng dữ liệu.
// Yêu cầu tên tổ chức phải có độ dài từ 2 đến 100 ký tự (sau khi đã cắt bỏ khoảng trắng thừa).
const schema = z.object({
  organizationName: z.string().trim().min(2, 'Tối thiểu 2 ký tự').max(100, 'Tối đa 100 ký tự'),
})
type FormValues = z.infer<typeof schema>

export function PublisherRegister() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const [verificationFile, setVerificationFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const verificationInputRef = useRef<HTMLInputElement>(null)

  // ==========================================
  // 2. KIỂM TRA TRẠNG THÁI HIỆN TẠI (ĐÃ ĐĂNG KÝ CHƯA?)
  // ==========================================
  // Lấy hồ sơ đăng ký Publisher hiện tại của tài khoản đang đăng nhập
  // retry: false để tránh gọi lại nhiều lần nếu gặp lỗi (ví dụ 404)
  const me = useQuery({
    queryKey: ['publisher-me'],
    retry: false,
    queryFn: async () => (await publisherService.getMe()).data,
  })

  // Khởi tạo thư viện quản lý form (react-hook-form) tích hợp chung với Zod
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const isResubmission = me.data?.verificationStatus === 'Rejected'

  useEffect(() => {
    if (isResubmission && me.data) {
      setValue('organizationName', me.data.organizationName)
    }
  }, [isResubmission, me.data, setValue])

  // 2.1. Đang trong quá trình kiểm tra hồ sơ từ máy chủ
  if (me.isLoading) return <p className="text-sm text-muted-foreground">Đang kiểm tra hồ sơ...</p>
  
  // 2.2. Chỉ chuyển sang /publisher/status khi hồ sơ KHÔNG phải Rejected
  if (me.data && me.data.verificationStatus !== 'Rejected') {
    return <Navigate to="/publisher/status" state={{ publisher: me.data }} replace />
  }

  // 2.3. Xử lý trường hợp lỗi khi kiểm tra hồ sơ
  // Nếu mã lỗi là 404 (Not Found): Nghĩa là user chưa từng đăng ký Publisher -> Cho phép ở lại trang này để điền form
  // Nếu là các lỗi khác (500, mất mạng...): Thông báo lỗi hệ thống
  const notRegistered = isAxiosError(me.error) && me.error.response?.status === 404
  if (me.isError && !notRegistered) {
    return <p className="text-sm">Không kiểm tra được hồ sơ Publisher. Thử lại sau.</p>
  }

  // ==========================================
  // 3. XỬ LÝ KHI USER BẤM "GỬI HỒ SƠ"
  // ==========================================
  const onSubmit = async (values: FormValues) => {
    setServerError(null)
    if (!verificationFile) {
      setFileError('Vui lòng chụp ảnh hoặc chọn giấy tờ xác minh.')
      return
    }

    try {
      await publisherService.register(values, verificationFile)
      
      // 3.2. Bắt React Query làm mới (tải lại) dữ liệu query key ['publisher-me']
      await qc.invalidateQueries({ queryKey: ['publisher-me'] })
      
      // 3.3. Đăng ký thành công! Đưa user sang trang theo dõi trạng thái xét duyệt
      navigate('/publisher/status', { replace: true })
    } catch (err) {
      // Bắt lỗi từ Backend (409: đã đăng ký trước đó, 400: sai định dạng...)
      const status = isAxiosError(err) ? err.response?.status : undefined
      setServerError(
        status === 409
          ? 'Tài khoản này đã đăng ký Publisher.'
          : status === 413
            ? 'Tệp quá lớn. Vui lòng chọn tệp tối đa 10 MB.'
          : status === 400
            ? 'Thông tin không hợp lệ.'
            : 'Không kết nối được máy chủ. Thử lại sau.',
      )
    }
  }

  // ==========================================
  // 4. HIỂN THỊ GIAO DIỆN (UI)
  // ==========================================
  return (
    <div className="mx-auto w-full max-w-md space-y-6 py-10">
      {/* Tiêu đề và mô tả hướng dẫn */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">
          {isResubmission ? 'Gửi lại giấy tờ xác minh' : 'Đăng ký Publisher'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isResubmission
            ? 'Hồ sơ trước đó chưa được duyệt. Cập nhật tên tổ chức nếu cần và gửi lại giấy tờ để Admin kiểm tra.'
            : 'Nhập tên tổ chức và đính kèm giấy tờ xác minh. Hồ sơ sẽ được quản trị viên xét duyệt trước khi bạn dùng được khu vực Publisher.'}
        </p>
      </div>
      
      {/* Form đăng ký thông tin */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {isResubmission && me.data?.verificationDocumentUrl && (
          <div className="rounded-lg border border-border p-3 text-sm">
            <p className="font-medium">Giấy tờ đã gửi trước đó</p>
            <a
              href={me.data.verificationDocumentUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex text-primary underline"
            >
              Xem giấy tờ hiện tại
            </a>
            <p className="mt-1 text-xs text-muted-foreground">
              Chọn một tệp mới bên dưới để thay thế giấy tờ cũ.
            </p>
          </div>
        )}

        {/* Trường nhập Tên tổ chức */}
        <div className="space-y-1.5">
          <Label htmlFor="organizationName">Tên tổ chức</Label>
          <Input id="organizationName" {...register('organizationName')} />
          {errors.organizationName && (
            <p className="text-xs text-red-600">{errors.organizationName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="verificationFile">Giấy tờ xác minh</Label>
          <p className="text-xs text-muted-foreground">
            Chụp ảnh giấy phép/giấy tờ của tổ chức hoặc tải ảnh hay tệp PDF lên (tối đa 10 MB).
          </p>
          <Input
            id="verificationFile"
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
            <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
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
          {fileError && <p className="text-xs text-red-600">{fileError}</p>}
        </div>
        
        {/* Hiển thị lỗi từ Backend */}
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        
        {/* Nút Submit (Tự động mờ và vô hiệu hóa khi đang gửi dữ liệu) */}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting
            ? 'Đang gửi...'
            : isResubmission
              ? 'Gửi lại giấy tờ xác minh'
              : 'Gửi hồ sơ'}
        </Button>
      </form>
    </div>
  )
}

export default PublisherRegister
