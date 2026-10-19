import { BookOpen, Compass, Heart, Sparkles } from 'lucide-react'
import { Link, Outlet } from 'react-router'

export function AuthLayout() {
  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <aside className="relative isolate flex min-h-[320px] flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-violet-950 px-6 py-8 text-primary-foreground sm:px-10 sm:py-10 lg:min-h-screen lg:px-14 lg:py-12">
        <div className="pointer-events-none absolute -right-24 -top-24 -z-10 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 -z-10 h-96 w-96 rounded-full bg-fuchsia-400/20 blur-3xl" />

        <Link to="/" className="inline-flex w-fit items-center gap-3 font-extrabold tracking-tight">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/20 bg-white/10">
            <BookOpen className="h-6 w-6" />
          </span>
          <span className="text-2xl">NovaManga</span>
        </Link>

        <div className="max-w-xl space-y-6 py-8 lg:py-0">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              Thế giới truyện của riêng bạn
            </span>
            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Mỗi câu chuyện mở ra một thế giới mới.
            </h1>
            <p className="max-w-lg text-sm leading-6 text-primary-foreground/75 sm:text-base">
              Khám phá những bộ manga và novel hấp dẫn, lưu lại hành trình đọc và chia sẻ câu chuyện của bạn.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/60">
              Chọn thế giới bạn yêu thích
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Phiêu lưu', icon: Compass },
                { label: 'Tình cảm', icon: Heart },
                { label: 'Giả tưởng', icon: Sparkles },
                { label: 'Manga & Novel', icon: BookOpen },
              ].map(({ label, icon: Icon }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-sm text-primary-foreground/90"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <p className="text-xs text-primary-foreground/55">© NovaManga · Đọc, khám phá và sáng tạo.</p>
      </aside>

      <section className="flex min-h-[640px] flex-col bg-muted/30 px-4 py-5 sm:px-8 lg:min-h-screen lg:px-10">
        <div className="flex justify-end">
          <Link to="/" className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            Về trang chủ
          </Link>
        </div>
        <main className="flex flex-1 items-center justify-center py-6">
          <Outlet />
        </main>
      </section>
    </div>
  )
}

export default AuthLayout
