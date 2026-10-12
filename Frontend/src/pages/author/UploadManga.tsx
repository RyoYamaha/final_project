import { ContentForm } from '@/components/content/ContentForm'

export function UploadManga() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Đăng truyện tranh</h1>
      <ContentForm type="Manga" />
    </div>
  )
}
export default UploadManga
