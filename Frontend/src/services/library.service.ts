import { api } from '@/lib/api'
import type { LibraryEntry } from '@/types/library'
import type { CollectionKind } from '@/hooks/useCollection'

export const libraryService = {
  getCollection: (kind: CollectionKind) => api.get<LibraryEntry[]>(`/${kind}`),
  add: (kind: CollectionKind, contentId: string) => api.post(`/${kind}`, { contentId }),
  remove: (kind: CollectionKind, contentId: string) => api.delete(`/${kind}/${contentId}`),
}
