import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import {CreateReportDto} from './dto/create-report.dto'
@Injectable()
export class ReportService {
    constructor (private readonly prisma: PrismaService){}
    async createReport(reporterId: string, dto: CreateReportDto ) {
        return this.prisma.report.create({data: { reporterId, targetType: dto.targetType,
            reason: dto.reason, evidence: dto.evidence, targetId: dto.targetId}});
    }
    async getMyReports(reporterId: string ){
        return this.prisma.report.findMany({
            where: { reporterId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getAllReports(status?: string){
        return this.prisma.report.findMany({
            where: status ? { status } : {},
            orderBy: { createdAt: 'desc' },
        });

    }
    async getReportById(id: string){
        const existed = await this.prisma.report.findUnique({where: {id: id}});
        if (!existed){
            throw new NotFoundException('We did not find any report');
        }
        return existed;
    }
    async dismissReport(id: string){
        const report = await this.prisma.report.findUnique({ where: { id } });
        if (!report){
            throw new NotFoundException('Report does not exist');
        }
        return this.prisma.report.update({ where: { id }, data: { status: 'Dismissed' } });
    }
    async resolveReport(id: string){
        const report = await this.prisma.report.findUnique({ where: { id } });
        if (!report){
            throw new NotFoundException('Report does not exist');
        }
        return this.prisma.report.update({ where: { id }, data: { status: 'Resolved' } });
    }
}