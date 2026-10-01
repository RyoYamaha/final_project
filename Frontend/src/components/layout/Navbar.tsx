import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Bell, Bookmark, Heart, LogOut, Search } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const APP_NAME = 'NovaManga' // wireframe ghi "Novic", chốt tên rồi sửa tại đây

export function Navbar() {
    const navigate = useNavigate()
    const user = useAuthStore((s) => s.user)
    const clearAuth = useAuthStore((s) => s.clearAuth)
    const [query, setQuery] = useState('')

    const handleSearch = (e: FormEvent) => {
        e.preventDefault()
        const q = query.trim()
        if (!q) return
        navigate(`/search?q=${encodeURIComponent(q)}`)
    }

    const handleLogout = async () => {
        clearAuth() // dùng được cho cả logout đồng bộ lẫn async
        navigate('/login', { replace: true })
    }

    // Chỉnh theo field thật của user trong auth-store
    const displayName = user?.email ?? 'User'
    const initial = displayName.charAt(0).toUpperCase()

    return (
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
            <div className="flex h-14 items-center gap-4 px-4">
                <Link to="/" className="text-lg font-bold tracking-tight">
                    {APP_NAME}
                </Link>

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
                        <Button variant="ghost" size="icon" asChild aria-label="Thông báo">
                            <Link to="/inbox">
                                <Bell className="h-5 w-5" />
                            </Link>
                        </Button>

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
                                <DropdownMenuLabel className="truncate">{displayName}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem render={<Link to="/library" />}>
                                    Thư viện
                                </DropdownMenuItem>
                                <DropdownMenuItem render={<Link to="/author/dashboard" />}>
                                    Khu vực Author
                                </DropdownMenuItem>
                                <DropdownMenuItem render={<Link to="/publisher/dashboard" />}>
                                    Khu vực Publisher
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={handleLogout} className="text-red-600">
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