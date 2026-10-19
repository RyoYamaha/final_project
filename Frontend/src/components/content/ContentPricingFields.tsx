import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  pricingType: 'free' | 'paid'
  priceCoins: number
  freeChapters: number
  allowCommunityTranslation: boolean
  priceCoinsError?: string
  freeChaptersError?: string
  onPricingTypeChange: (value: 'free' | 'paid') => void
  onPriceCoinsChange: (value: number) => void
  onFreeChaptersChange: (value: number) => void
  onAllowCommunityTranslationChange: (value: boolean) => void
  showCommunityTranslation?: boolean
  showPricing?: boolean
}

export function ContentPricingFields({
  pricingType,
  priceCoins,
  freeChapters,
  allowCommunityTranslation,
  priceCoinsError,
  freeChaptersError,
  onPricingTypeChange,
  onPriceCoinsChange,
  onFreeChaptersChange,
  onAllowCommunityTranslationChange,
  showCommunityTranslation = false,
  showPricing = true,
}: Props) {
  if (!showPricing) return null

  return (
    <section className="space-y-3 border-t border-border/50 pt-4">
      <h3 className="text-sm font-bold tracking-wider text-muted-foreground uppercase">
        Giá và chương đọc thử
      </h3>

      <div className="space-y-1.5">
        <Label htmlFor="pricingType">Hình thức</Label>
        <select
          id="pricingType"
          value={pricingType}
          onChange={(event) => {
            if (event.target.value === 'free' || event.target.value === 'paid') {
              if (event.target.value === 'free') {
                onPriceCoinsChange(0)
              } else if (!Number.isFinite(priceCoins) || priceCoins < 1) {
                onPriceCoinsChange(50)
              }
              if (!Number.isFinite(freeChapters)) {
                onFreeChaptersChange(3)
              }
              onPricingTypeChange(event.target.value)
            }
          }}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="free">Miễn phí</option>
          <option value="paid">Trả phí — mua cả bộ một lần</option>
        </select>
      </div>

      {pricingType === 'paid' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="priceCoins">Giá bộ truyện (coin)</Label>
            <Input
              id="priceCoins"
              type="number"
              min={1}
              step={1}
              value={Number.isNaN(priceCoins) ? '' : priceCoins}
              onChange={(event) => onPriceCoinsChange(event.target.valueAsNumber)}
            />
            {priceCoinsError && (
              <p className="text-xs text-red-600">{priceCoinsError}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="freeChapters">Số chương đọc thử miễn phí</Label>
            <Input
              id="freeChapters"
              type="number"
              min={0}
              step={1}
              value={Number.isNaN(freeChapters) ? '' : freeChapters}
              onChange={(event) => onFreeChaptersChange(event.target.valueAsNumber)}
            />
            {freeChaptersError && (
              <p className="text-xs text-red-600">{freeChaptersError}</p>
            )}
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Mặc định 3 chương đầu được đọc thử. Mua một lần sẽ mở khóa cả bộ.
          </p>
        </div>
      )}

      {showCommunityTranslation && pricingType === 'free' && (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={allowCommunityTranslation}
            onChange={(event) =>
              onAllowCommunityTranslationChange(event.target.checked)
            }
          />
          <span>
            Cho phép cộng đồng tạo Fan Translation khi truyện đang miễn phí.
          </span>
        </label>
      )}

      {showCommunityTranslation && pricingType === 'paid' && (
        <p className="text-xs text-muted-foreground">
          Khi chuyển sang trả phí, quyền tạo bản dịch mới sẽ tự tắt.
        </p>
      )}
    </section>
  )
}
