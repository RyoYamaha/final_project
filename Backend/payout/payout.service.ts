import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePayoutRequestDto } from './dto/create-payout-request.dto';
import { RejectPayoutDto } from './dto/reject-payout.dto';
import { UpdatePayoutProfileDto } from './dto/update-payout-profile.dto';
import { UpdatePayoutSettingsDto } from './dto/update-payout-settings.dto';

const MINIMUM_PAYOUT_SETTING = 'payout.minimumCoins';
const PAYOUT_HOLD_DAYS_SETTING = 'payout.holdDays';

@Injectable()
export class PayoutService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.payoutProfile.findUnique({
      where: { userId },
      select: {
        bankName: true,
        bankBin: true,
        bankAccountNumber: true,
        bankAccountName: true,
        updatedAt: true,
      },
    });

    return {
      configured: profile !== null,
      profile,
    };
  }

  async updateProfile(userId: string, dto: UpdatePayoutProfileDto) {
    return this.prisma.payoutProfile.upsert({
      where: { userId },
      create: {
        userId,
        bankName: dto.bankName.trim(),
        bankBin: dto.bankBin.trim(),
        bankAccountNumber: dto.bankAccountNumber.trim(),
        bankAccountName: dto.bankAccountName.trim(),
      },
      update: {
        bankName: dto.bankName.trim(),
        bankBin: dto.bankBin.trim(),
        bankAccountNumber: dto.bankAccountNumber.trim(),
        bankAccountName: dto.bankAccountName.trim(),
      },
      select: {
        bankName: true,
        bankBin: true,
        bankAccountNumber: true,
        bankAccountName: true,
        updatedAt: true,
      },
    });
  }

  async getMinimumPayout() {
    return this.readSettingNumber(MINIMUM_PAYOUT_SETTING, 10);
  }

  async updateMinimumPayout(dto: UpdatePayoutSettingsDto) {
    await this.prisma.systemSetting.upsert({
      where: { key: MINIMUM_PAYOUT_SETTING },
      create: {
        key: MINIMUM_PAYOUT_SETTING,
        value: String(dto.minimumCoins),
      },
      update: {
        value: String(dto.minimumCoins),
      },
    });

    return { minimumCoins: dto.minimumCoins };
  }

  async requestPayout(userId: string, dto: CreatePayoutRequestDto) {
    const minimumCoins = await this.readSettingNumber(
      MINIMUM_PAYOUT_SETTING,
      10,
    );
    const holdDays = await this.readSettingNumber(PAYOUT_HOLD_DAYS_SETTING, 0);
    const profile = await this.prisma.payoutProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new BadRequestException(
        'Vui lòng thiết lập hồ sơ ngân hàng nhận payout trước',
      );
    }

    if (!Number.isSafeInteger(dto.amountCoins) || dto.amountCoins <= 0) {
      throw new BadRequestException('Số coin yêu cầu rút không hợp lệ');
    }

    if (dto.amountCoins < minimumCoins) {
      throw new BadRequestException(
        `Số coin rút tối thiểu là ${minimumCoins} coin`,
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { payoutBlocked: true },
        });

        if (!user) {
          throw new NotFoundException('Không tìm thấy tài khoản');
        }

        if (user.payoutBlocked) {
          throw new ForbiddenException(
            'Tài khoản hiện không được phép gửi yêu cầu payout',
          );
        }

        const eligibleSince = new Date(
          Date.now() - holdDays * 24 * 60 * 60 * 1000,
        );
        const eligibleRevenue = await tx.creatorRevenue.aggregate({
          where: {
            creatorId: userId,
            createdAt: { lte: eligibleSince },
          },
          _sum: { creatorCoins: true },
        });

        const reservedPayouts = await tx.payoutRequest.aggregate({
          where: {
            userId,
            status: { in: ['Pending', 'Paid'] },
          },
          _sum: { amountCoins: true },
        });

        let totalEligibleCoins = 0;
        if (eligibleRevenue._sum.creatorCoins !== null) {
          totalEligibleCoins = eligibleRevenue._sum.creatorCoins;
        }

        let reservedCoins = 0;
        if (reservedPayouts._sum.amountCoins !== null) {
          reservedCoins = reservedPayouts._sum.amountCoins;
        }

        const availableCoins = totalEligibleCoins - reservedCoins;

        if (dto.amountCoins > availableCoins) {
          throw new BadRequestException(
            `Số dư có thể payout không đủ. Hiện có ${availableCoins} coin`,
          );
        }

        return tx.payoutRequest.create({
          data: {
            userId,
            amountCoins: dto.amountCoins,
            bankName: profile.bankName,
            bankBin: profile.bankBin,
            bankAccountNumber: profile.bankAccountNumber,
            bankAccountName: profile.bankAccountName,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async getMyRequests(userId: string, page: number, limit: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.payoutRequest.findMany({
        where: { userId },
        select: {
          id: true,
          amountCoins: true,
          status: true,
          bankName: true,
          bankBin: true,
          bankAccountNumber: true,
          bankAccountName: true,
          requestedAt: true,
          processedAt: true,
          rejectionReason: true,
        },
        orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payoutRequest.count({ where: { userId } }),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPendingRequests(page: number, limit: number) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.payoutRequest.findMany({
        where: { status: 'Pending' },
        select: {
          id: true,
          userId: true,
          amountCoins: true,
          status: true,
          bankName: true,
          bankBin: true,
          bankAccountNumber: true,
          bankAccountName: true,
          requestedAt: true,
          user: {
            select: { username: true, email: true },
          },
        },
        orderBy: [{ requestedAt: 'asc' }, { id: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payoutRequest.count({ where: { status: 'Pending' } }),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async markPaid(requestId: string, adminId: string) {
    const result = await this.prisma.payoutRequest.updateMany({
      where: { id: requestId, status: 'Pending' },
      data: {
        status: 'Paid',
        processedAt: new Date(),
        processedById: adminId,
      },
    });

    if (result.count !== 1) {
      throw new ConflictException(
        'Yêu cầu payout không tồn tại hoặc đã được xử lý',
      );
    }

    return this.prisma.payoutRequest.findUniqueOrThrow({
      where: { id: requestId },
    });
  }

  async reject(requestId: string, adminId: string, dto: RejectPayoutDto) {
    const reason = dto.reason.trim();
    if (reason.length < 3) {
      throw new BadRequestException('Vui lòng nhập lý do từ chối hợp lệ');
    }

    const result = await this.prisma.payoutRequest.updateMany({
      where: { id: requestId, status: 'Pending' },
      data: {
        status: 'Rejected',
        processedAt: new Date(),
        processedById: adminId,
        rejectionReason: reason,
      },
    });

    if (result.count !== 1) {
      throw new ConflictException(
        'Yêu cầu payout không tồn tại hoặc đã được xử lý',
      );
    }

    return this.prisma.payoutRequest.findUniqueOrThrow({
      where: { id: requestId },
    });
  }

  async setPayoutBlocked(userId: string, payoutBlocked: boolean) {
    const result = await this.prisma.user.updateMany({
      where: { id: userId },
      data: { payoutBlocked },
    });

    if (result.count !== 1) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        payoutBlocked: true,
      },
    });
  }

  private async readSettingNumber(key: string, defaultValue: number) {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
      select: { value: true },
    });

    if (!setting) {
      return defaultValue;
    }

    const value = Number(setting.value);
    let minimumAllowedValue = 0;
    if (key === MINIMUM_PAYOUT_SETTING) {
      minimumAllowedValue = 10;
    }

    if (!Number.isSafeInteger(value) || value < minimumAllowedValue) {
      throw new InternalServerErrorException(
        `Cấu hình ${key} trong SystemSetting không hợp lệ`,
      );
    }

    return value;
  }
}
