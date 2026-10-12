import { PublisherContentForm } from '@/components/content/PublisherContentForm'

export function PublisherUploadNovel() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Đăng tiểu thuyết</h1>
      <PublisherContentForm type="Novel" />
    </div>
  )
}
export default PublisherUploadNovel
