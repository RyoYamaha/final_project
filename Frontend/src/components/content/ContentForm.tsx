import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useForm, Controller } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { authorService } from '@/services/author.service'
import { contentService } from '@/services/content.service'
import { financeService } from '@/services/finance.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TagInput } from '@/components/ui/tag-input'
import { ContentPricingFields } from '@/components/content/ContentPricingFields'
import { PaidContentPayoutNotice } from '@/components/content/PaidContentPayoutNotice'
import type { ContentType } from '@/types/content'

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

interface Props {
  type: ContentType
  parentContentId?: string // có giá trị => tạo bản dịch
}

export function ContentForm({ type, parentContentId }: Props) {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)

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
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ 
    resolver: zodResolver(schema),
    defaultValues: {
      pricingType: 'free',
      priceCoins: 50,
      freeChapters: 3,
      allowCommunityTranslation: false,
      genreIds: [],
      tagIds: [],
    }
  })

  const pricingType = watch('pricingType')
  const payoutProfileQuery = useQuery({
    queryKey: ['payout', 'profile'],
    queryFn: async () => (await financeService.getPayoutProfile()).data,
    enabled: !parentContentId && pricingType === 'paid',
  })
  const payoutProfile = payoutProfileQuery.data?.profile
  const hasPayoutProfile = Boolean(
    payoutProfile?.bankName.trim() &&
      payoutProfile.bankBin.trim() &&
      payoutProfile.bankAccountNumber.trim() &&
      payoutProfile.bankAccountName.trim(),
  )

  const onSubmit = async (v: FormValues) => {
    setServerError(null)

    if (
      !parentContentId &&
      v.pricingType === 'paid' &&
      (!hasPayoutProfile || payoutProfileQuery.isLoading || payoutProfileQuery.isError)
    ) {
      setServerError(
        'Vui lòng hoàn tất thông tin tài khoản nhận tiền trước khi đăng truyện trả phí.',
      )
      return
    }
    
    let coverUrl: string | undefined = undefined
    if (coverFile) {
      try {
        const res = await authorService.uploadCover(coverFile)
        coverUrl = res.url
      } catch {
        setServerError('Tải ảnh bìa thất bại. Vui lòng thử lại.')
        return
      }
    }
    
    const dto = {
      title: v.title,
      type,
      synopsis: v.synopsis || undefined,
      pricingType: parentContentId ? 'free' : v.pricingType,
      priceCoins: parentContentId || v.pricingType === 'free' ? 0 : v.priceCoins,
      freeChapters: parentContentId ? 0 : v.freeChapters,
      allowCommunityTranslation: false,
      coverImageUrl: coverUrl,
      genreIds: v.genreIds && v.genreIds.length > 0 ? v.genreIds : undefined,
      tagIds: v.tagIds && v.tagIds.length > 0 ? v.tagIds : undefined,
    }
    try {
      if (parentContentId) {
        await authorService.createTranslation({ ...dto, parentContentId })
      } else {
        await authorService.createOriginal(dto)
      }
      navigate('/author/dashboard', { replace: true })
    } catch (err) {
      const status = isAxiosError(err) ? err.response?.status : undefined
      const responseMessage =
        isAxiosError(err) && typeof err.response?.data?.message === 'string'
          ? err.response.data.message
          : undefined
      setServerError(
        status === 400
          ? responseMessage || 'Thông tin không hợp lệ.'
          : status === 403
            ? 'Bạn không có quyền thực hiện thao tác này.'
            : 'Không kết nối được máy chủ. Thử lại sau.',
      )
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
        showPricing={!parentContentId}
      />
      {!parentContentId && pricingType === 'paid' && (
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
                suggestions={genres.map(g => g.name)}
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
                suggestions={tags.map(t => t.name)}
              />
            )}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="coverImage">Ảnh bìa (tuỳ chọn)</Label>
        <Input 
          id="coverImage" 
          type="file" 
          accept="image/*" 
          onChange={(e) => setCoverFile(e.target.files?.[0] || null)} 
        />
        {coverFile && <p className="text-xs text-muted-foreground">Đã chọn: {coverFile.name}</p>}
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      <Button
        type="submit"
        disabled={
          isSubmitting ||
          (!parentContentId &&
            pricingType === 'paid' &&
            (payoutProfileQuery.isLoading ||
              payoutProfileQuery.isError ||
              !hasPayoutProfile))
        }
      >
        {isSubmitting ? 'Đang gửi...' : parentContentId ? 'Gửi bản dịch' : 'Tạo truyện'}
      </Button>
    </form>
  )
}
