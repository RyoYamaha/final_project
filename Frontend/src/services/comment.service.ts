import { api } from '@/lib/api'

export interface CommentUser {
  id: string
  username: string
}

export interface CommentData {
  id: string
  userId: string
  contentId: string
  parentCommentId?: string | null
  body: string
  createdAt: string
  user: CommentUser
  replies?: CommentData[]
}

export const commentService = {
  getComments: async (contentId: string) => {
    try {
      const res = await api.get<CommentData[]>(`/comments/${contentId}`)
      return res.data
    } catch (error: any) {
      if (error.response?.status === 404) {
        return [] // Backend ném 404 nếu không có comment nào
      }
      throw error
    }
  },

  createComment: async (contentId: string, body: string, parentCommentId?: string) => {
    const res = await api.post<CommentData>('/comments', { contentId, body, parentCommentId })
    return res.data
  },

  deleteComment: async (commentId: string) => {
    const res = await api.delete(`/comments/${commentId}`)
    return res.data
  },
}
