import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { JwtAuthGuard } from 'common/guards/jwt-auth.guard';
import { CurrentUser } from 'common/decorators/current-user.decorator';
import { CreateTicketDto, ReplyTicketDto } from './dto/ticket.dto';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class TicketController {
  constructor(private readonly service: TicketService) {}

  @Post()
  createTicket(@CurrentUser('id') userId: string, @Body() dto: CreateTicketDto) {
    return this.service.createTicket(userId, dto);
  }

  @Get('me')
  getMyTickets(@CurrentUser('id') userId: string) {
    return this.service.getMyTickets(userId);
  }

  @Get()
  getAllTickets(@CurrentUser('role') role: string) {
    return this.service.getAllTickets(role);
  }

  @Get(':id')
  getTicketDetails(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id') ticketId: string
  ) {
    return this.service.getTicketDetails(userId, ticketId, role);
  }

  @Post(':id/messages')
  replyTicket(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id') ticketId: string,
    @Body() dto: ReplyTicketDto
  ) {
    return this.service.replyTicket(userId, ticketId, dto, role);
  }
}
