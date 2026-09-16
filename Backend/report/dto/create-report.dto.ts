import { IsEnum, IsString, MinLength, MaxLength, IsOptional, IsUUID } from 'class-validator';
import { ReportTargetType } from '../../common/constants/report.enum';

export class CreateReportDto{
    @IsEnum(ReportTargetType)
    targetType: ReportTargetType;
    @IsUUID()
    targetId: string;
    @IsString()
    @MinLength(5)
    @MaxLength(1000)
    reason: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    evidence?: string;
}