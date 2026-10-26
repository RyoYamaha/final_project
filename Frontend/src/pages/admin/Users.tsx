import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LockKeyhole, Pencil, Search, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { adminService, type AdminUser } from '@/services/admin.service'
import { useAuthStore } from '@/stores/auth-store'
import { useAppDialog } from '@/components/common/AppDialogProvider'

type EditableUserRole = 'Reader' | 'Author' | 'Publisher'

interface UserForm {
  username: string
  email: string
  role: EditableUserRole
  bio: string
}

const emptyForm: UserForm = {
  username: '',
  email: '',
  role: 'Reader',
  bio: '',
}

const roleLabels: Record<AdminUser['role'], string> = {
  Reader: 'Người đọc',
  Author: 'Tác giả',
  Publisher: 'Publisher',
  Admin: 'Admin',
}

export function Users() {
  const queryClient = useQueryClient()
  const { confirm } = useAppDialog()
  const currentUser = useAuthStore((state) => state.user)
  const [searchText, setSearchText] = useState('')
  const [form, setForm] = useState<UserForm>(emptyForm)
  const [editingUserId, setEditingUserId] = useState<string>()

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminService.getUsers,
  })
  const users = usersQuery.data ?? []
  const normalizedSearch = searchText.trim().toLowerCase()
  const filteredUsers = users.filter((user) =>
    [user.username, user.email, user.role].some((value) =>
      value.toLowerCase().includes(normalizedSearch),
    ),
  )

  const refreshUsers = () =>
    queryClient.invalidateQueries({ queryKey: ['admin-users'] })

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, values }: {
      userId: string
      values: UserForm
    }) => adminService.updateUser(userId, values),
    onSuccess: async () => {
      setForm(emptyForm)
      setEditingUserId(undefined)
      await refreshUsers()
    },
  })

  const lockUserMutation = useMutation({
    mutationFn: adminService.lockUser,
    onSuccess: refreshUsers,
  })

  const unlockUserMutation = useMutation({
    mutationFn: adminService.unlockUser,
    onSuccess: refreshUsers,
  })

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingUserId) return
    const existingUser = users.find((user) => user.id === editingUserId)
    if (existingUser && existingUser.role !== form.role) {
      const confirmed = await confirm({
        title: 'Xác nhận thay đổi vai trò',
        description: `Thay đổi vai trò của "${existingUser.username}" từ ${roleLabels[existingUser.role]} thành ${roleLabels[form.role]}? Việc này sẽ thay đổi quyền truy cập của tài khoản.`,
        confirmLabel: 'Thay đổi vai trò',
        tone: 'destructive',
      })
      if (!confirmed) return
    }
    updateUserMutation.mutate({
      userId: editingUserId,
      values: {
        username: form.username.trim(),
        email: form.email.trim(),
        role: form.role,
        bio: form.bio.trim(),
      },
    })
  }

  const handleLockUser = async (user: AdminUser) => {
    const shouldLock = await confirm({
      title: 'Xác nhận khóa tài khoản',
      description: `Bạn có chắc muốn khóa tài khoản "${user.username}"? Tài khoản và dữ liệu vẫn được giữ lại.`,
      confirmLabel: 'Khóa tài khoản',
      tone: 'destructive',
    })
    if (shouldLock) lockUserMutation.mutate(user.id)
  }

  const handleUnlockUser = async (user: AdminUser) => {
    const shouldUnlock = await confirm({
      title: 'Xác nhận mở khóa tài khoản',
      description: `Mở khóa tài khoản "${user.username}" để người dùng có thể đăng nhập lại?`,
      confirmLabel: 'Mở khóa',
    })
    if (shouldUnlock) {
      unlockUserMutation.mutate(user.id)
    }
  }

  const startEditing = (user: AdminUser) => {
    if (user.role === 'Admin') return
    setEditingUserId(user.id)
    setForm({
      username: user.username,
      email: user.email,
      role: user.role,
      bio: user.bio ?? '',
    })
  }

  const cancelForm = () => {
    setEditingUserId(undefined)
    setForm(emptyForm)
  }

  const isSaving = updateUserMutation.isPending

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Quản lý người dùng</h1>
          <p className="text-sm text-muted-foreground">
            Chỉnh sửa thông tin hoặc khóa tài khoản người dùng.
          </p>
        </div>
      </div>

      {editingUserId && (
        <form
          onSubmit={handleUpdate}
          className="space-y-4 rounded-xl border border-border bg-card p-4"
        >
          <h2 className="font-semibold">Chỉnh sửa người dùng</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Tên đăng nhập</span>
              <Input
                required
                minLength={3}
                maxLength={30}
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Email</span>
              <Input
                required
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>Vai trò</span>
              <select
                value={form.role}
                onChange={(event) =>
                  setForm({ ...form, role: event.target.value as EditableUserRole })
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="Reader">Người đọc</option>
                <option value="Author">Tác giả</option>
                <option value="Publisher">Publisher</option>
              </select>
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span>Giới thiệu (không bắt buộc)</span>
              <textarea
                maxLength={1000}
                rows={3}
                value={form.bio}
                onChange={(event) => setForm({ ...form, bio: event.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
            <Button type="button" variant="outline" onClick={cancelForm}>
              Hủy
            </Button>
          </div>
          {updateUserMutation.isError && (
            <p className="text-sm text-destructive">
              Không lưu được người dùng. Hãy kiểm tra email hoặc tên đăng nhập có bị trùng không.
            </p>
          )}
        </form>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Tìm theo tên, email hoặc vai trò..."
          className="pl-9"
          aria-label="Tìm người dùng"
        />
      </div>

      {usersQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Đang tải người dùng...</p>
      ) : usersQuery.isError ? (
        <div className="space-y-2">
          <p className="text-sm text-destructive">Không tải được danh sách người dùng.</p>
          <Button size="sm" variant="outline" onClick={() => usersQuery.refetch()}>
            Thử lại
          </Button>
        </div>
      ) : filteredUsers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Không tìm thấy người dùng.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="p-3 font-semibold">Người dùng</th>
                <th className="p-3 font-semibold">Vai trò</th>
                <th className="p-3 font-semibold">Ngày tạo</th>
                <th className="p-3 text-right font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const isAdminAccount = user.role === 'Admin'
                const isCurrentAdmin = user.id === currentUser?.id
                const isChangingStatus =
                  lockUserMutation.isPending || unlockUserMutation.isPending

                return (
                  <tr key={user.id} className="border-b border-border last:border-0">
                    <td className="p-3">
                      <p className="font-medium">{user.username}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </td>
                    <td className="p-3">{roleLabels[user.role]}</td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        {!isAdminAccount && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditing(user)}
                              disabled={isSaving}
                            >
                              <Pencil className="mr-1 h-3.5 w-3.5" />
                              Sửa
                            </Button>
                            {user.isLocked ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isChangingStatus}
                                onClick={() => void handleUnlockUser(user)}
                              >
                                <UserRound className="mr-1 h-3.5 w-3.5" />
                                Mở khóa
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isCurrentAdmin || isChangingStatus}
                                title={isCurrentAdmin ? 'Không thể khóa tài khoản đang đăng nhập' : 'Khóa tài khoản'}
                                className="border-amber-500/50 text-amber-700 hover:bg-amber-500/10 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                                onClick={() => handleLockUser(user)}
                              >
                                <LockKeyhole className="mr-1 h-3.5 w-3.5" />
                                Khóa tài khoản
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {(lockUserMutation.isError || unlockUserMutation.isError) && (
        <p className="text-sm text-destructive">
          Không cập nhật được trạng thái tài khoản. Vui lòng thử lại.
        </p>
      )}
    </div>
  )
}

export default Users
