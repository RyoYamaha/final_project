import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useForm, Controller } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { publisherService } from '@/services/publisher.service'
import { contentService } from '@/services/content.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TagInput } from '@/components/ui/tag-input'
import { ContentPricingFields } from '@/components/content/ContentPricingFields'
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
}

export function PublisherContentForm({ type }: Props) {
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
    },
  })

  const onSubmit = async (v: FormValues) => {
    setServerError(null)

    let coverUrl: string | undefined = undefined
    if (coverFile) {
      try {
        const res = await publisherService.uploadCover(coverFile)
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
      pricingType: v.pricingType,
      priceCoins: v.pricingType === 'free' ? 0 : v.priceCoins,
      freeChapters: v.freeChapters,
      allowCommunityTranslation:
        v.pricingType === 'free' && v.allowCommunityTranslation,
      coverImageUrl: coverUrl,
      genreIds: v.genreIds && v.genreIds.length > 0 ? v.genreIds : undefined,
      tagIds: v.tagIds && v.tagIds.length > 0 ? v.tagIds : undefined,
    }
    try {
      await publisherService.createOriginal(dto)
      navigate('/publisher/dashboard', { replace: true })
    } catch (err) {
      const status = isAxiosError(err) ? err.response?.status : undefined
      setServerError(
        status === 400
          ? 'Thông tin không hợp lệ.'
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
        pricingType={watch('pricingType')}
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
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Đang gửi...' : 'Tạo truyện'}
      </Button>
    </form>
  )
}
