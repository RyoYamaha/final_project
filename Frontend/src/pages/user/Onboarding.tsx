import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, BookOpen, Check, Coins, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { contentService } from '@/services/content.service'
import { preferenceService } from '@/services/preference.service'
import { useAuthStore } from '@/stores/auth-store'

const INTRO_SLIDES = [
  {
    eyebrow: 'Chào mừng đến với NovaManga',
    title: 'Thế giới truyện của riêng bạn',
    description: 'Khám phá manga và novel từ cộng đồng sáng tạo, tất cả trong một nơi.',
    icon: BookOpen,
    accent: 'from-violet-500/25 via-fuchsia-500/10 to-transparent',
  },
  {
    eyebrow: 'Đọc truyện linh hoạt',
    title: 'Coin giúp bạn mở khóa chương',
    description: 'Theo dõi số dư coin và dùng coin để mở khóa nội dung trả phí khi bạn muốn.',
    icon: Coins,
    accent: 'from-amber-500/25 via-orange-500/10 to-transparent',
  },
  {
    eyebrow: 'Bắt đầu thật dễ dàng',
    title: 'Có truyện miễn phí để đọc thử',
    description: 'Tìm câu chuyện hợp gu, đọc thử miễn phí rồi quyết định có muốn tiếp tục hay không.',
    icon: Sparkles,
    accent: 'from-cyan-500/25 via-blue-500/10 to-transparent',
  },
]

export function Onboarding() {
  const navigate = useNavigate()
  const setUser = useAuthStore((state) => state.setUser)
  const user = useAuthStore((state) => state.user)
  const [step, setStep] = useState(0)
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const genresQuery = useQuery({
    queryKey: ['genres'],
    queryFn: async () => (await contentService.getGenres()).data,
  })

  if (user?.onboardingCompletedAt) return <Navigate to="/" replace />

  const isGenreStep = step === INTRO_SLIDES.length

  const finishOnboarding = async (genreIds: string[]) => {
    setError(null)
    setIsSaving(true)
    try {
      const { data } = await preferenceService.saveGenrePreferences(genreIds)
      if (user) setUser({ ...user, onboardingCompletedAt: data.onboardingCompletedAt })
      navigate('/', { replace: true })
    } catch {
      setError('Không thể lưu lựa chọn lúc này. Vui lòng thử lại.')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleGenre = (genreId: string) => {
    setSelectedGenres((current) =>
      current.includes(genreId)
        ? current.filter((selectedId) => selectedId !== genreId)
        : current.length < 5
          ? [...current, genreId]
          : current,
    )
    setError(null)
  }

  const continueOnboarding = () => {
    if (isGenreStep) {
      if (selectedGenres.length < 3) {
        setError('Chọn ít nhất 3 thể loại để cá nhân hóa gợi ý.')
        return
      }
      void finishOnboarding(selectedGenres)
      return
    }
    setStep((current) => current + 1)
  }

  const slide = INTRO_SLIDES[step]
  const SlideIcon = slide?.icon
  const progress = ((step + 1) / (INTRO_SLIDES.length + 1)) * 100

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-3xl items-center justify-center py-8">
      <section className="w-full overflow-hidden rounded-3xl border border-border bg-card shadow-xl shadow-primary/5">
        <div className="flex items-center gap-1.5 px-6 pt-6" aria-label={`Bước ${step + 1} trên ${INTRO_SLIDES.length + 1}`}>
          {INTRO_SLIDES.map((item, index) => (
            <span
              key={item.title}
              className={`h-1.5 flex-1 rounded-full transition-colors ${index <= step ? 'bg-primary' : 'bg-muted'}`}
            />
          ))}
          <span className={`h-1.5 flex-1 rounded-full ${isGenreStep ? 'bg-primary' : 'bg-muted'}`} />
          <span className="sr-only">{Math.round(progress)}% hoàn tất</span>
        </div>

        <div className="flex items-center justify-between px-6 pt-4">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            NovaManga · Bắt đầu
          </span>
          <Button variant="ghost" size="sm" disabled={isSaving} onClick={() => void finishOnboarding([])}>
            Bỏ qua
          </Button>
        </div>

        {!isGenreStep && slide && SlideIcon ? (
          <div className={`mx-6 mt-3 rounded-2xl bg-gradient-to-br ${slide.accent} p-8 sm:p-12`}>
            <div className="mx-auto flex max-w-xl flex-col items-center text-center">
              <span className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-border/60 bg-background/80 shadow-sm">
                <SlideIcon className="h-9 w-9 text-primary" />
              </span>
              <p className="text-sm font-semibold text-primary">{slide.eyebrow}</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{slide.title}</h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">
                {slide.description}
              </p>
            </div>
          </div>
        ) : (
          <div className="px-6 pb-2 pt-5 sm:px-10">
            <div className="mx-auto max-w-2xl">
              <p className="text-sm font-semibold text-primary">Bước cuối · Cá nhân hóa</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">Bạn thích thể loại nào?</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Chọn từ 3 đến 5 thể loại để NovaManga tìm truyện hợp gu bạn.
              </p>

              {genresQuery.isLoading && (
                <p className="py-10 text-center text-sm text-muted-foreground">Đang tải thể loại...</p>
              )}
              {genresQuery.isError && (
                <div className="space-y-3 py-8 text-center">
                  <p className="text-sm text-destructive">Không thể tải danh sách thể loại.</p>
                  <Button variant="outline" size="sm" onClick={() => void genresQuery.refetch()}>Thử lại</Button>
                </div>
              )}
              {genresQuery.data && (
                <>
                  <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {genresQuery.data.map((genre) => {
                      const selected = selectedGenres.includes(genre.id)
                      return (
                        <button
                          key={genre.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleGenre(genre.id)}
                          className={`flex min-h-14 items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                            selected
                              ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                              : 'border-border bg-background hover:border-primary/50 hover:bg-muted/40'
                          }`}
                        >
                          {genre.name}
                          {selected && <Check className="ml-2 h-4 w-4 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground" aria-live="polite">
                    Đã chọn {selectedGenres.length}/5 · Cần tối thiểu 3 thể loại
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 px-6 py-6 sm:px-10">
          <Button
            variant="outline"
            disabled={step === 0 || isSaving}
            onClick={() => setStep((current) => current - 1)}
          >
            <ArrowLeft /> Quay lại
          </Button>
          <div className="flex min-w-0 flex-1 flex-col items-end">
            {error && <p className="mb-2 text-right text-xs text-destructive">{error}</p>}
            <Button
              disabled={isSaving || (isGenreStep && (genresQuery.isLoading || genresQuery.isError))}
              onClick={continueOnboarding}
            >
              {isSaving ? 'Đang lưu...' : isGenreStep ? 'Hoàn tất' : 'Tiếp tục'}
              {!isSaving && <ArrowRight />}
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
