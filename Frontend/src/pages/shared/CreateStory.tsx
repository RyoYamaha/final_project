import { ArrowRight, BookOpen, FileText } from 'lucide-react'
import { Link } from 'react-router'
import { useAuthStore } from '@/stores/auth-store'

export function CreateStory() {
  const role = useAuthStore((state) => state.user?.role)
  const uploadPath = role === 'Publisher' ? '/publisher/upload' : '/author/upload'

  return (
    <section className="mx-auto max-w-3xl space-y-3 py-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Tạo truyện</h1>
        <p className="text-sm text-muted-foreground">Chọn loại nội dung bạn muốn đăng.</p>
      </div>

      <div className="grid gap-4 pt-3 sm:grid-cols-2">
        <Link
          to={`${uploadPath}/manga`}
          className="group flex min-h-48 flex-col justify-between rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/50 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="space-y-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BookOpen className="h-6 w-6" />
            </span>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Manga</h2>
              <p className="text-sm text-muted-foreground">Đăng truyện tranh và các chương truyện.</p>
            </div>
          </div>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
            Tạo truyện tranh
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>

        <Link
          to={`${uploadPath}/novel`}
          className="group flex min-h-48 flex-col justify-between rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/50 hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="space-y-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-6 w-6" />
            </span>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Novel</h2>
              <p className="text-sm text-muted-foreground">Đăng truyện chữ và các chương nội dung.</p>
            </div>
          </div>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
            Tạo truyện chữ
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>
      </div>
    </section>
  )
}

export default CreateStory
