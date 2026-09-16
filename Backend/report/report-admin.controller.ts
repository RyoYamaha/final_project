import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ReportService } from './report.service';
import { JwtAuthGuard } from 'common/guards/jwt-auth.guard';
import { Roles } from 'common/decorators/roles.decorator';
import { Role } from 'common/constants/roles.enum';
import { RolesGuard } from 'common/guards/roles.guard';

@UseGuards(JwtAuthGuard,RolesGuard )
@Roles(Role.Admin)
@Controller('admin/reports')
export class ReportAdminController {
    constructor (private readonly service: ReportService){}

    //admin xem toàn bộ report được lọc theo status
    @Get()
    getAllReports(@Query('status') status?: string) {
        return this.service.getAllReports(status);
    }
    @Get(':id')
    getReportById(@Param('id') id: string) {
        return this.service.getReportById(id);
    }
    @Patch(':id/dismiss')
    dismissReport(@Param('id') id: string){
        return this.service.dismissReport(id);
    }
    @Patch(':id/resolve')
    resolveReport(@Param('id') id: string){
        return this.service.resolveReport(id);
    }
}