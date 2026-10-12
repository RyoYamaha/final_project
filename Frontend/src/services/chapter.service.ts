import { api } from '@/lib/api'
import type { Chapter } from '@/types/chapter'
import type { ContentType } from '@/types/content'
import type { CreateChapterDto } from '@/types/author'

const base = (type: ContentType) => (type === 'Manga' ? '/manga' : '/novel')

export const chapterService = {
  create: async (type: ContentType, contentId: string, dto: CreateChapterDto) =>
    (await api.post<Chapter>(`${base(type)}/content/${contentId}/chapters`, dto)).data,

  update: async (type: ContentType, chapterId: string, dto: { title?: string }) =>
    (await api.patch<Chapter>(`${base(type)}/chapters/${chapterId}`, dto)).data,

  uploadMangaPages: async (chapterId: string, files: File[]) => {
    const fd = new FormData()
    files.forEach((f) => fd.append('pages', f))
    return (await api.post(`/manga/chapters/${chapterId}/pages`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data
  },

  setNovelText: async (chapterId: string, textBody: string) =>
    (await api.post(`/novel/chapters/${chapterId}/text`, { textBody })).data,

  uploadNovelPdf: async (chapterId: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return (await api.post(`/novel/chapters/${chapterId}/pdf`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data
  },

  getMangaPages: async (chapterId: string) =>
    (await api.get(`/manga/chapters/${chapterId}/pages`)).data,

  // Dùng khi tác giả đang edit — không bị chặn khi chapter đang PendingReview
  getMangaPagesForAuthor: async (chapterId: string) =>
    (await api.get(`/manga/chapters/${chapterId}/pages/author`)).data,

  getNovelChapterTextForAuthor: async (chapterId: string) =>
    (await api.get(`/novel/chapters/${chapterId}/text/author`)).data,

  deleteMangaPage: async (chapterId: string, pageId: string) =>
    (await api.delete(`/manga/chapters/${chapterId}/pages/${pageId}`)).data,

  reorderMangaPages: async (chapterId: string, pageIds: string[]) =>
    (await api.patch(`/manga/chapters/${chapterId}/pages/reorder`, { pageIds })).data,

  replaceMangaPageImage: async (chapterId: string, pageId: string, file: File) => {
    const fd = new FormData()
    fd.append('page', file)
    return (await api.patch(`/manga/chapters/${chapterId}/pages/${pageId}/image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })).data
  },
}
