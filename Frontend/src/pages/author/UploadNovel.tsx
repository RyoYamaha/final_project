import { ContentForm } from '@/components/content/ContentForm'

export function UploadNovel() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Đăng tiểu thuyết</h1>
      <ContentForm type="Novel" />
    </div>
  )
}
export default UploadNovel
