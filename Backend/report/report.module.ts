import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportAdminController } from './report-admin.controller';
import { ReportService } from './report.service';

@Module({
	controllers: [ReportController, ReportAdminController],
	providers: [ReportService],
	exports: [ReportService],
})
export class ReportModule {}
