import { useState } from 'react'
import { Navigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { contentService } from '@/services/content.service'
import { preferenceService } from '@/services/preference.service'
import { useAuthStore } from '@/stores/auth-store'

export function GenrePreferences() {
  const user = useAuthStore((state) => state.user)
  const [selectedGenres, setSelectedGenres] = useState<string[] | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const genresQuery = useQuery({
    queryKey: ['genres'],
    queryFn: async () => (await contentService.getGenres()).data,
  })
  const preferencesQuery = useQuery({
    queryKey: ['genre-preferences'],
    queryFn: async () => (await preferenceService.getGenrePreferences()).data,
  })
  const setUser = useAuthStore((state) => state.setUser)
  const selectedIds = selectedGenres ?? preferencesQuery.data?.genres.map(({ id }) => id) ?? []

  if (user?.role !== 'Reader') return <Navigate to="/" replace />

  const toggleGenre = (genreId: string) => {
    setSelectedGenres((current) => {
      const currentIds = current ?? preferencesQuery.data?.genres.map(({ id }) => id) ?? []
      if (currentIds.includes(genreId)) return currentIds.filter((id) => id !== genreId)
      return currentIds.length < 5 ? [...currentIds, genreId] : currentIds
    })
    setMessage(null)
  }

  const savePreferences = async () => {
    if (selectedIds.length < 3 || selectedIds.length > 5) {
      setMessage('Hãy chọn từ 3 đến 5 thể loại.')
      return
    }
    setIsSaving(true)
    setMessage(null)
    try {
      const { data } = await preferenceService.saveGenrePreferences(selectedIds)
      setUser({ ...user, onboardingCompletedAt: data.onboardingCompletedAt })
      setSelectedGenres(null)
      setMessage('Đã lưu sở thích thể loại.')
      await preferencesQuery.refetch()
    } catch {
      setMessage('Không thể lưu sở thích. Vui lòng thử lại.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-primary">Cài đặt tài khoản</p>
        <h1 className="text-3xl font-bold tracking-tight">Sở thích thể loại</h1>
        <p className="text-sm text-muted-foreground">
          Cập nhật thể loại để điều chỉnh mục gợi ý truyện của bạn. Chọn từ 3 đến 5 thể loại.
        </p>
      </header>

      {(genresQuery.isLoading || preferencesQuery.isLoading) && (
        <p className="py-10 text-center text-sm text-muted-foreground">Đang tải sở thích...</p>
      )}
      {(genresQuery.isError || preferencesQuery.isError) && (
        <div className="space-y-3 rounded-xl border border-destructive/30 p-5 text-center">
          <p className="text-sm text-destructive">Không thể tải sở thích thể loại.</p>
          <Button variant="outline" size="sm" onClick={() => {
            void genresQuery.refetch()
            void preferencesQuery.refetch()
          }}>Thử lại</Button>
        </div>
      )}
      {genresQuery.data && preferencesQuery.data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {genresQuery.data.map((genre) => {
              const selected = selectedIds.includes(genre.id)
              return (
                <button
                  key={genre.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleGenre(genre.id)}
                  className={`flex min-h-14 items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                    selected
                      ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                      : 'border-border bg-card hover:border-primary/50 hover:bg-muted/40'
                  }`}
                >
                  {genre.name}
                  {selected && <Check className="ml-2 h-4 w-4 shrink-0" />}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground" aria-live="polite">
              Đã chọn {selectedIds.length}/5
              {message && <span className="ml-2 text-foreground">{message}</span>}
            </p>
            <Button onClick={() => void savePreferences()} disabled={isSaving}>
              {isSaving ? 'Đang lưu...' : 'Lưu sở thích'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
