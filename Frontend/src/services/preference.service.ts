import { api } from '@/lib/api'
import type { Genre } from '@/types/content'

export interface GenrePreferencesResponse {
  onboardingCompletedAt: string | null
  genres: Genre[]
}

export const preferenceService = {
  getGenrePreferences: () => api.get<GenrePreferencesResponse>('/auth/genre-preferences'),
  saveGenrePreferences: (genreIds: string[]) =>
    api.put<GenrePreferencesResponse>('/auth/genre-preferences', { genreIds }),
}
