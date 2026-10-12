import { PublisherContentForm } from '@/components/content/PublisherContentForm'

export function PublisherUploadManga() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Đăng truyện tranh</h1>
      <PublisherContentForm type="Manga" />
    </div>
  )
}
export default PublisherUploadManga
