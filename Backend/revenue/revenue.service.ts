import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryRevenueHistoryDto } from './dto/query-revenue-history.dto';

@Injectable()
export class RevenueService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string) {
    const totals = await this.prisma.creatorRevenue.aggregate({
      where: { creatorId: userId },
      _sum: {
        grossCoins: true,
        creatorCoins: true,
        platformCoins: true,
      },
      _count: { id: true },
    });

    const reservedPayouts = await this.prisma.payoutRequest.aggregate({
      where: {
        userId,
        status: { in: ['Pending', 'Paid'] },
      },
      _sum: { amountCoins: true },
    });

    let totalGrossCoins = 0;
    if (totals._sum.grossCoins !== null) {
      totalGrossCoins = totals._sum.grossCoins;
    }

    let totalEarnedCoins = 0;
    if (totals._sum.creatorCoins !== null) {
      totalEarnedCoins = totals._sum.creatorCoins;
    }

    let totalPlatformCoins = 0;
    if (totals._sum.platformCoins !== null) {
      totalPlatformCoins = totals._sum.platformCoins;
    }

    let reservedCoins = 0;
    if (reservedPayouts._sum.amountCoins !== null) {
      reservedCoins = reservedPayouts._sum.amountCoins;
    }

    return {
      totalSales: totals._count.id,
      totalGrossCoins,
      totalEarnedCoins,
      totalPlatformCoins,
      reservedCoins,
      availableCoins: totalEarnedCoins - reservedCoins,
    };
  }

  async getHistory(userId: string, query: QueryRevenueHistoryDto) {
    const page = query.page;
    const limit = query.limit;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.creatorRevenue.findMany({
        where: { creatorId: userId },
        select: {
          id: true,
          grossCoins: true,
          sharePercent: true,
          creatorCoins: true,
          platformCoins: true,
          createdAt: true,
          purchase: {
            select: {
              id: true,
              purchasedAt: true,
            },
          },
          content: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.creatorRevenue.count({
        where: { creatorId: userId },
      }),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}
