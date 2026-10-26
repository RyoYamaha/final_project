import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { publisherService } from '@/services/publisher.service'
import { contentService } from '@/services/content.service'
import { financeService } from '@/services/finance.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TagInput } from '@/components/ui/tag-input'
import { ContentPricingFields } from '@/components/content/ContentPricingFields'
import { PaidContentPayoutNotice } from '@/components/content/PaidContentPayoutNotice'
import { useAppDialog } from '@/components/common/AppDialogProvider'
import { Clock, ArrowLeft } from 'lucide-react'

const schema = z.object({
  title: z.string().trim().min(1, 'Nhập tên truyện').max(255, 'Tối đa 255 ký tự'),
  synopsis: z.string().trim().optional(),
  pricingType: z.enum(['free', 'paid']),
  priceCoins: z.number().int().min(0, 'Giá không được âm'),
  freeChapters: z.number().int().min(0, 'Số chương đọc thử không được âm'),
  allowCommunityTranslation: z.boolean(),
  genreIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
}).refine(
  (values) => values.pricingType === 'free' || values.priceCoins >= 1,
  { path: ['priceCoins'], message: 'Giá phải từ 1 coin trở lên' },
)
type FormValues = z.infer<typeof schema>

export function PublisherEditContent() {
  const { alert, confirm } = useAppDialog()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [currentCoverUrl, setCurrentCoverUrl] = useState<string>('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  const { data: contentData, isLoading } = useQuery({
    queryKey: ['content', id],
    queryFn: async () => (await contentService.getDetail(id!)).data,
    enabled: !!id,
  })

  const { data: genres = [] } = useQuery({
    queryKey: ['genres'],
    queryFn: async () => (await contentService.getGenres()).data,
  })

  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => (await contentService.getTags()).data,
  })

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      synopsis: '',
      pricingType: 'free',
      priceCoins: 50,
      freeChapters: 3,
      allowCommunityTranslation: false,
      genreIds: [],
      tagIds: [],
    },
  })

  const pricingType = watch('pricingType')
  const requiresPayoutProfile = Boolean(
    contentData &&
      contentData.pricingType !== 'paid' &&
      pricingType === 'paid',
  )
  const payoutProfileQuery = useQuery({
    queryKey: ['payout', 'profile'],
    queryFn: async () => (await financeService.getPayoutProfile()).data,
    enabled: requiresPayoutProfile,
  })
  const payoutProfile = payoutProfileQuery.data?.profile
  const hasPayoutProfile = Boolean(
    payoutProfile?.bankName.trim() &&
      payoutProfile.bankBin.trim() &&
      payoutProfile.bankAccountNumber.trim() &&
      payoutProfile.bankAccountName.trim(),
  )

  useEffect(() => {
    if (contentData) {
      reset({
        title: contentData.title,
        synopsis: contentData.synopsis || '',
        pricingType: contentData.pricingType,
        priceCoins: contentData.priceCoins || 50,
        freeChapters: contentData.freeChapters,
        allowCommunityTranslation: contentData.allowCommunityTranslation,
        genreIds: contentData.genres?.map((g: any) => g.genre.name) || [],
        tagIds: contentData.tags?.map((t: any) => t.tag.name) || [],
      })
      setCurrentCoverUrl(contentData.coverImageUrl || '')
    }
  }, [contentData, reset])

  const mutation = useMutation({
    mutationFn: async (v: FormValues) => {
      let finalCoverUrl = currentCoverUrl
      if (coverFile) {
        const res = await publisherService.uploadCover(coverFile)
        finalCoverUrl = res.url
      }
      return publisherService.updateContent(id!, {
        title: v.title,
        synopsis: v.synopsis || undefined,
        pricingType: v.pricingType,
        priceCoins: v.pricingType === 'free' ? 0 : v.priceCoins,
        freeChapters: v.freeChapters,
        allowCommunityTranslation:
          v.pricingType === 'free' && v.allowCommunityTranslation,
        coverImageUrl: finalCoverUrl || undefined,
        genreIds: v.genreIds && v.genreIds.length > 0 ? v.genreIds : undefined,
        tagIds: v.tagIds && v.tagIds.length > 0 ? v.tagIds : undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content', id] })
      queryClient.invalidateQueries({ queryKey: ['publisher-contents'] })
      setSaveSuccess(true)
    },
    onError: (error: unknown) => {
      const responseMessage =
        isAxiosError(error) && typeof error.response?.data?.message === 'string'
          ? error.response.data.message
          : undefined
      setServerError(
        responseMessage ||
          'Không thể cập nhật. Vui lòng kiểm tra lại quyền hoặc thử lại sau.',
      )
    },
  })

  const handleFormSubmit = async (values: FormValues) => {
    if (
      requiresPayoutProfile &&
      (!hasPayoutProfile || payoutProfileQuery.isLoading || payoutProfileQuery.isError)
    ) {
      setServerError(
        'Vui lòng hoàn tất thông tin tài khoản nhận tiền trước khi chuyển truyện sang trả phí.',
      )
      return
    }

    const nextPriceCoins = values.pricingType === 'free' ? 0 : values.priceCoins
    if (
      contentData &&
      (contentData.pricingType !== values.pricingType ||
        contentData.priceCoins !== nextPriceCoins)
    ) {
      const confirmed = await confirm({
        title: 'Xác nhận thay đổi giá truyện',
        description: `Thay đổi giá "${contentData.title}" từ ${contentData.pricingType === 'paid' ? `${contentData.priceCoins} coin` : 'miễn phí'} sang ${values.pricingType === 'paid' ? `${nextPriceCoins} coin` : 'miễn phí'}?`,
        confirmLabel: 'Thay đổi giá',
      })
      if (!confirmed) return
    }

    mutation.mutate(values)
  }

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Đang tải...</p>

  // Màn hình thông báo sau khi lưu thành công
  if (saveSuccess) {
    return (
      <div className="mx-auto max-w-lg py-20 flex flex-col items-center gap-6 text-center">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center">
          <Clock className="w-10 h-10 text-amber-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Đã lưu thay đổi!</h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-sm">
            Thông tin truyện đã được cập nhật và chuyển về trạng thái
            <span className="font-semibold text-amber-500"> Chờ duyệt</span>.
            Truyện sẽ tạm thời <span className="font-semibold">bị ẩn khỏi trang chính</span> cho đến khi Admin xem xét và duyệt lại.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <Button variant="outline" onClick={() => setSaveSuccess(false)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Tiếp tục chỉnh sửa
          </Button>
          <Button onClick={() => navigate('/publisher/dashboard')}>
            Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 p-4">
      <h1 className="text-2xl font-bold">Chỉnh sửa thông tin truyện</h1>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="title">Tên truyện</Label>
          <Input id="title" {...register('title')} />
          {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="synopsis">Giới thiệu</Label>
          <textarea
            id="synopsis"
            rows={5}
            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            {...register('synopsis')}
          />
        </div>

        <ContentPricingFields
          pricingType={pricingType}
          priceCoins={watch('priceCoins')}
          freeChapters={watch('freeChapters')}
          allowCommunityTranslation={watch('allowCommunityTranslation')}
          priceCoinsError={errors.priceCoins?.message}
          freeChaptersError={errors.freeChapters?.message}
          onPricingTypeChange={(value) =>
            setValue('pricingType', value, { shouldValidate: true })
          }
          onPriceCoinsChange={(value) =>
            setValue('priceCoins', value, { shouldValidate: true })
          }
          onFreeChaptersChange={(value) =>
            setValue('freeChapters', value, { shouldValidate: true })
          }
          onAllowCommunityTranslationChange={(value) =>
            setValue('allowCommunityTranslation', value, {
              shouldValidate: true,
            })
          }
          showCommunityTranslation
        />
        {requiresPayoutProfile && (
          <PaidContentPayoutNotice
            isLoading={payoutProfileQuery.isLoading}
            isError={payoutProfileQuery.isError}
            isConfigured={hasPayoutProfile}
          />
        )}

        <div className="space-y-6 pt-4 border-t border-border/50">
          <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">Genre & Tags</h3>

          <div className="space-y-1.5">
            <Label>Genre <span className="text-destructive">*</span></Label>
            <Controller
              control={control}
              name="genreIds"
              render={({ field }) => (
                <TagInput
                  value={field.value || []}
                  onChange={field.onChange}
                  addLabel="Add Genre"
                  placeholder="Type genre and press Enter"
                  suggestions={genres.map((g: any) => g.name)}
                />
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Tags</Label>
            <Controller
              control={control}
              name="tagIds"
              render={({ field }) => (
                <TagInput
                  value={field.value || []}
                  onChange={field.onChange}
                  addLabel="Add Tag"
                  placeholder="Type tag and press Enter"
                  suggestions={tags.map((t: any) => t.name)}
                />
              )}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="coverImage">Ảnh bìa mới (tuỳ chọn)</Label>
          {currentCoverUrl && !coverFile && (
            <div className="mb-2">
              <img src={currentCoverUrl} alt="Cover" className="h-32 w-24 object-cover rounded-md" />
            </div>
          )}
          <Input
            id="coverImage"
            type="file"
            accept="image/*"
            onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
          />
          {coverFile && <p className="text-xs text-muted-foreground">Đã chọn: {coverFile.name}</p>}
        </div>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate('/publisher/dashboard')}>
            Về Dashboard
          </Button>
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              mutation.isPending ||
              (requiresPayoutProfile &&
                (payoutProfileQuery.isLoading ||
                  payoutProfileQuery.isError ||
                  !hasPayoutProfile))
            }
          >
            {isSubmitting || mutation.isPending ? 'Đang lưu...' : 'Lưu thông tin truyện'}
          </Button>
        </div>
      </form>

      {/* --- QUẢN LÝ CHƯƠNG --- */}
      <div className="space-y-4 pt-8 mt-8 border-t border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Danh sách chương ({contentData?.chapters?.length || 0})</h2>
          <Button asChild size="sm">
            <Link to={`/publisher/content/${id}/chapters/new`}>Đăng chapter mới</Link>
          </Button>
        </div>

        {(!contentData?.chapters || contentData.chapters.length === 0) ? (
          <p className="text-sm text-muted-foreground p-4 bg-muted/20 rounded-lg text-center border border-dashed border-border">
            Chưa có chương nào. Hãy đăng chương đầu tiên!
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {contentData.chapters.map((c: any) => (
              <li key={c.id} className="flex items-center justify-between p-3 text-sm hover:bg-muted/30 transition-colors">
                <div>
                  <span className="font-semibold">Chương {c.number}</span>
                  {c.title && <span className="text-muted-foreground ml-2">- {c.title}</span>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/publisher/content/${id}/chapters/${c.id}/edit`}>Sửa</Link>
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-white" onClick={() => void alert({
                    title: 'Tính năng chưa sẵn sàng',
                    description: 'Tính năng xóa chương đang được hoàn thiện.',
                  })}>
                    Xóa
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default PublisherEditContent
