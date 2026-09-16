import { Body, Controller, Get, UseGuards, Post } from '@nestjs/common';
import { ReportService } from './report.service';
import { JwtAuthGuard } from 'common/guards/jwt-auth.guard';
import { CurrentUser } from 'common/decorators/current-user.decorator';
import { CreateReportDto } from './dto/create-report.dto';
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportController{
    constructor (private readonly service: ReportService){}
    @Post()
    createReport(@CurrentUser('id') reporterId: string, @Body() dto: CreateReportDto){
        return this.service.createReport(reporterId, dto);
    }
    @Get('me')
    getMyReports(@CurrentUser('id') reporterId: string){
        return this.service.getMyReports(reporterId);
    }

}