import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportStatus, ReportTargetType } from '../common/constants/report.enum';

@Injectable()
export class ReportService {
    constructor(private readonly prisma: PrismaService) {}

    async createReport(reporterId: string, dto: CreateReportDto) {
        await this.verifyTargetExists(dto.targetType, dto.targetId);
        return this.prisma.report.create({
            data: {
                reporterId,
                targetType: dto.targetType,
                reason: dto.reason,
                evidence: dto.evidence,
                targetId: dto.targetId,
            },
        });
    }

    async getMyReports(reporterId: string) {
        return this.prisma.report.findMany({
            where: { reporterId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getAllReports(status?: string) {
        if (status && !Object.values(ReportStatus).includes(status as ReportStatus)) {
            throw new BadRequestException('Trạng thái báo cáo không hợp lệ');
        }
        return this.prisma.report.findMany({
            where: status ? { status } : undefined,
            orderBy: { createdAt: 'desc' },
            include: {
                reporter: { select: { id: true, username: true } },
            },
        });
    }

    async getReportById(id: string) {
        const report = await this.prisma.report.findUnique({
            where: { id },
            include: {
                reporter: { select: { id: true, username: true } },
            },
        });
        if (!report) {
            throw new NotFoundException('Không tìm thấy báo cáo');
        }
        return report;
    }

    async dismissReport(id: string) {
        const report = await this.prisma.report.findUnique({ where: { id } });
        if (!report) {
            throw new NotFoundException('Không tìm thấy báo cáo');
        }
        return this.prisma.report.update({
            where: { id },
            data: { status: ReportStatus.Dismissed },
        });
    }

    async resolveReport(id: string) {
        const report = await this.prisma.report.findUnique({ where: { id } });
        if (!report) {
            throw new NotFoundException('Không tìm thấy báo cáo');
        }
        return this.prisma.report.update({
            where: { id },
            data: { status: ReportStatus.Resolved },
        });
    }

    private async verifyTargetExists(targetType: ReportTargetType, targetId: string) {
        let targetExists = false;

        switch (targetType) {
            case ReportTargetType.Content:
                targetExists = Boolean(await this.prisma.content.findUnique({ where: { id: targetId }, select: { id: true } }));
                break;
            case ReportTargetType.Chapter:
                targetExists = Boolean(await this.prisma.chapter.findUnique({ where: { id: targetId }, select: { id: true } }));
                break;
            case ReportTargetType.Comment:
                targetExists = Boolean(await this.prisma.comment.findUnique({ where: { id: targetId }, select: { id: true } }));
                break;
            case ReportTargetType.User:
                targetExists = Boolean(await this.prisma.user.findUnique({ where: { id: targetId }, select: { id: true } }));
                break;
        }

        if (!targetExists) {
            throw new NotFoundException('Không tìm thấy đối tượng cần báo cáo');
        }
    }
}