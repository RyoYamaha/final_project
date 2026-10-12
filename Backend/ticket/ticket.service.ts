import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateTicketDto, ReplyTicketDto } from './dto/ticket.dto';

@Injectable()
export class TicketService {
  constructor(private prisma: PrismaService) {}

  async createTicket(userId: string, dto: CreateTicketDto) {
    return this.prisma.supportTicket.create({
      data: {
        userId,
        subject: dto.subject,
        messages: {
          create: {
            senderId: userId,
            body: dto.body,
          },
        },
      },
      include: {
        messages: true,
      },
    });
  }

  async getMyTickets(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });
  }

  async getAllTickets(role: string) {
    if (role !== 'Admin') throw new ForbiddenException('Access denied');
    return this.prisma.supportTicket.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        user: { select: { id: true, username: true } },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            ticketId: true,
            senderId: true,
            body: true,
            createdAt: true,
            sender: { select: { username: true, role: true } },
          },
        },
        _count: {
          select: { messages: true },
        },
      },
    });
  }

  async getTicketDetails(userId: string, ticketId: string, role: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { id: true, username: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: { select: { id: true, username: true, role: true } },
          },
        },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.userId !== userId && role !== 'Admin') {
      throw new ForbiddenException('Access denied');
    }

    return ticket;
  }

  async replyTicket(userId: string, ticketId: string, dto: ReplyTicketDto, role: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    
    if (ticket.userId !== userId && role !== 'Admin') {
      throw new ForbiddenException('Access denied');
    }

    const message = await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        senderId: userId,
        body: dto.body,
      },
    });

    // Update ticket updatedAt and possibly status
    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        updatedAt: new Date(),
        status: role === 'Admin' ? 'AdminReplied' : 'Open',
      },
    });

    return message;
  }
}
