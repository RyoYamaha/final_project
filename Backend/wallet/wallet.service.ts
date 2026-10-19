import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryWalletTransactionsDto } from './dto/query-wallet-transactions.dto';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { balance: true, updatedAt: true },
    });

    return {
      balance: wallet?.balance ?? 0,
      updatedAt: wallet?.updatedAt ?? null,
    };
  }

  async getTransactions( userId: string, query: QueryWalletTransactionsDto) {
    const page = query.page ?? 1; //nếu giá trị bên trái bằng null hoặc undefine thì bằng giá trị bên phải 
    const limit = query.limit ?? 20;

    const [transactions, total] = await this.prisma.$transaction([
      this.prisma.walletLedger.findMany({
        where: {userId},
        select: {
          id: true,
          amountCoins: true,
          balanceAfter: true,
          transactionType: true,
          sourceType: true,
          sourceReference: true,
          description: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit, // skip 20 quyển, ví dụ page ở trang 2 thì skip đi 20 sách
        take: limit, //quy định số bản ghi được lấy là 20 quyển
      }),
      this.prisma.walletLedger.count({ where: {userId} }),
    ]);

    return {
      items: transactions,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}
