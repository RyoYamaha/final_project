import { api } from '@/lib/api'

export interface TicketMessage {
  id: string
  ticketId: string
  senderId: string
  body: string
  createdAt: string
  sender?: {
    id: string
    username: string
    role: string
  }
}

export interface SupportTicket {
  id: string
  userId: string
  subject: string
  status: 'Open' | 'Closed' | 'AdminReplied'
  createdAt: string
  updatedAt: string
  _count?: {
    messages: number
  }
  user?: {
    id: string
    username: string
  }
  messages?: TicketMessage[]
}

export const ticketService = {
  createTicket: (data: { subject: string; body: string }) => 
    api.post<SupportTicket>('/tickets', data),

  getMyTickets: () => 
    api.get<SupportTicket[]>('/tickets/me'),

  getAllTickets: () =>
    api.get<SupportTicket[]>('/tickets'),

  getTicketDetails: (id: string) => 
    api.get<SupportTicket>(`/tickets/${id}`),

  replyTicket: (id: string, data: { body: string }) => 
    api.post<TicketMessage>(`/tickets/${id}/messages`, data),
}
