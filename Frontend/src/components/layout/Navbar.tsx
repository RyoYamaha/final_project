import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useLocation } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Bookmark, Heart, LogOut, Search } from 'lucide-react'
import { authService } from '@/services/auth.service'
import { notificationService } from '@/services/notification.service'
import { REFRESH_TOKEN_KEY, useAuthStore } from '@/stores/auth-store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const APP_NAME = 'NovaManga'

export function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  
  const isNovel = location.pathname.includes('/novel')
  const isManga = !isNovel
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const [query, setQuery] = useState('')

  const unread = useQuery({
    queryKey: ['unread-count'],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async () => (await notificationService.getUnreadCount()).data,
  })

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    enabled: !!user,
    queryFn: async () => (await notificationService.getAll()).data,
  })

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    navigate(`/?search=${encodeURIComponent(q)}`) // TẠM: chưa có trang /search, xem ghi chú
  }

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    try {
      if (refreshToken) await authService.logout(refreshToken)
    } catch {
      // Thu hồi thất bại vẫn phải đăng xuất phía client
    } finally {
      clearAuth()
      queryClient.clear()
      navigate('/login', { replace: true })
    }
  }

  const displayName = user?.username ?? user?.email ?? 'User'
  const initial = displayName.charAt(0).toUpperCase()
  const unreadCount = unread.data ?? 0

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center gap-4 px-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-xl font-extrabold tracking-tight">
            {APP_NAME}
          </Link>

          {/* Selector Manga / Novel */}
          <div className="hidden md:flex items-center bg-muted/30 p-1 rounded-lg border border-border/50">
            <Link 
              to="/manga" 
              className={`flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-md outline-none focus-visible:ring-1 transition-all ${
                isManga 
                  ? 'font-semibold bg-background text-foreground shadow-sm border border-border/50' 
                  : 'font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent'
              }`}
            >
              Manga
            </Link>

            <Link 
              to="/novel" 
              className={`flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-md transition-all ${
                isNovel 
                  ? 'font-semibold bg-background text-foreground shadow-sm border border-border/50' 
                  : 'font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent'
              }`}
            >
              Novel
            </Link>
          </div>
        </div>

        <form onSubmit={handleSearch} className="relative mx-auto w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm truyện..."
            className="pl-9"
            aria-label="Tìm kiếm"
          />
        </form>

        {user ? (
          <nav className="flex items-center gap-1">
            {/* 1. Nút Thông báo (Cho tất cả các Role) */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground h-9 w-9 relative outline-none"
                aria-label="Thông báo"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="font-semibold text-sm">Thông báo mới</span>
                </div>
                <DropdownMenuSeparator />
                <div className="max-h-[300px] overflow-y-auto">
                  {notificationsQuery.isLoading && (
                    <div className="p-4 text-center text-sm text-muted-foreground">Đang tải...</div>
                  )}
                  {notificationsQuery.data && notificationsQuery.data.length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">Không có thông báo nào.</div>
                  )}
                  {notificationsQuery.data && notificationsQuery.data.slice(0, 5).map((notification) => (
                    <DropdownMenuItem key={notification.id} onClick={() => navigate('/inbox')} className="flex flex-col items-start gap-1 p-3 cursor-pointer">
                      <span className={`text-sm ${notification.isRead ? 'text-muted-foreground' : 'font-medium'}`}>
                        {notification.message}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="p-0">
                  <Button variant="ghost" className="w-full justify-center rounded-none font-semibold text-sm h-10" onClick={() => navigate('/inbox')}>
                    Xem tất cả
                  </Button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Các tính năng chung cho Reader */}
            {user.role === 'Reader' && (
              <>
                <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                  <Link to="/library?tab=favourite">
                    <Heart className="mr-1.5 h-4 w-4" /> Favourite
                  </Link>
                </Button>

                <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                  <Link to="/library?tab=bookmark">
                    <Bookmark className="mr-1.5 h-4 w-4" /> Bookmark
                  </Link>
                </Button>
              </>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger
                className="ml-1 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Menu tài khoản"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{initial}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5 text-sm font-semibold truncate">{displayName}</div>
                <DropdownMenuSeparator />
                
                {user.role === 'Reader' && (
                  <DropdownMenuItem onClick={() => navigate('/library')}>Thư viện</DropdownMenuItem>
                )}

                <DropdownMenuItem onClick={() => navigate('/wallet')}>Ví coin</DropdownMenuItem>

                {(user.role === 'Author' || user.role === 'Publisher') && (
                  <DropdownMenuItem onClick={() => navigate('/earnings')}>
                    Doanh thu và rút coin
                  </DropdownMenuItem>
                )}

                {user.role === 'Admin' && (
                  <>
                    <DropdownMenuItem onClick={() => navigate('/admin/payments')}>
                      Quản lý nạp coin
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/admin/payouts')}>
                      Quản lý payout
                    </DropdownMenuItem>
                  </>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        ) : (
          <Button asChild size="sm">
            <Link to="/login">Đăng nhập</Link>
          </Button>
        )}
      </div>
    </header>
  )
}

export default Navbar