import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportAdminController } from './report-admin.controller';
import { ReportService } from './report.service';
import { AuthModule } from '../user/auth/auth.module';

@Module({
	imports: [AuthModule],
	controllers: [ReportController, ReportAdminController],
	providers: [ReportService],
	exports: [ReportService],
})
export class ReportModule {}
