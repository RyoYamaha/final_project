import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContentService } from '../core/content/content.service';
import { CreateFanTranslationDto } from './dto/create-fan-translation.dto';
import { OwnershipTier, PublicationStatus } from '../common/constants/content.enum';
import { CreateOriginalContentDto } from './dto/create-original-content.dto';
import { UpdateContentDto } from '../core/content/dto/update-content.dto';

import { CloudinaryService } from '../common/cloudinary/cloudinary.service';

@Injectable()
export class AuthorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contentService: ContentService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /**
   * Danh sách Content Licensed để Author browse/search và chọn ra bản gốc muốn dịch.
   * Chỉ show Content đã Published (không cho dịch Content còn Draft/PendingApproval).
   */
  async browseLicensedContents(search?: string) {
    return this.prisma.content.findMany({where: { ownershipTier: OwnershipTier.Licensed, publicationStatus: PublicationStatus.Published,
        pricingType: 'free',
        allowCommunityTranslation: true,
        ...(search && { title: { contains: search } }),
      },
      select: {
        id: true,
        title: true,
        type: true,
        coverImageUrl: true,
        synopsis: true,
        pricingType: true,
        priceCoins: true,
        freeChapters: true,
        allowCommunityTranslation: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  //bản dịch do fan tự tạo 
  async createFanTranslation(userId: string, dto: CreateFanTranslationDto) {
    // Không cho tự dịch bản dịch của người khác — chỉ được dịch từ Content Licensed gốc
    // ContentService kiểm tra Content gốc trong transaction trước khi tạo để tránh kiểm tra lặp.
    return this.contentService.createContent(
      dto,
      userId,
      OwnershipTier.FanTranslation,
      undefined,
      dto.parentContentId,
    );
  }

  //tìm bản translation theo đúng userid 
  async getMyTranslations(userId: string) {
    return this.prisma.content.findMany({
      where: { uploaderId: userId, ownershipTier: OwnershipTier.FanTranslation },
      include: { parentContent: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Lấy tất cả truyện của chính Author (cả sáng tác gốc Original lẫn bản dịch FanTranslation)
  async getMyContents(userId: string) {
    return this.prisma.content.findMany({
      where: { uploaderId: userId },
      include: {
        parentContent: { select: { id: true, title: true } },
        genres: { include: { genre: true } },
        tags: { include: { tag: true } },
        _count: { select: { chapters: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Xem chi tiết truyện của chính tác giả (kèm tất cả các chương kể cả PendingReview)
  async getAuthorContentDetail(userId: string, contentId: string) {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        mangaDetail: true,
        novelDetail: true,
        genres: { include: { genre: true } },
        tags: { include: { tag: true } },
        chapters: { orderBy: { number: 'asc' } },
        uploader: { select: { id: true, username: true } },
        parentContent: { select: { id: true, title: true } },
      },
    });

    if (!content) throw new NotFoundException('Không tìm thấy Content');
    if (content.uploaderId !== userId) {
      throw new ForbiddenException('Không có quyền xem chi tiết truyện này trong khu vực Author');
    }

    return content;
  }

  // Chỉnh sửa truyện của Author
  async updateContent(userId: string, contentId: string, dto: UpdateContentDto) {
    return this.contentService.updateContent(contentId, userId, dto);
  }

  //gửi lại bản translation cho admin 
  async resubmitTranslation(userId: string, contentId: string) {
    return this.contentService.resubmit(contentId, userId);
  }

  async getDashboardStats(userId: string) {
    const allContents = await this.prisma.content.findMany({
      where: { uploaderId: userId },
      select: { id: true, title: true, type: true, ownershipTier: true, publicationStatus: true },
    });

    const contentIds = allContents.map((t) => t.id);

    const [bookmarkCount, ratingAgg, commentCount] = await this.prisma.$transaction([
      this.prisma.bookmark.count({ where: { contentId: { in: contentIds } } }),
      this.prisma.rating.aggregate({
        where: { contentId: { in: contentIds } },
        _avg: { score: true },
        _count: true,
      }),
      this.prisma.comment.count({ where: { contentId: { in: contentIds } } }),
    ]);

    const translations = allContents.filter((c) => c.ownershipTier === OwnershipTier.FanTranslation);
    const originals = allContents.filter((c) => c.ownershipTier === OwnershipTier.Original);

    return {
      totalContents: allContents.length,
      totalTranslations: translations.length,
      totalOriginals: originals.length,
      translations,
      contents: allContents,
      bookmarkCount,
      averageRating: ratingAgg._avg.score ?? 0,
      ratingCount: ratingAgg._count,
      commentCount,
    };
  }

  async createOriginalContent(userId: string, dto: CreateOriginalContentDto) {
    return this.contentService.createContent(
      dto,
      userId,
      OwnershipTier.Original,
    );
  }

  async uploadCoverImage(file: Express.Multer.File) {
    const result = await this.cloudinary.uploadImage(file.buffer, 'covers');
    return { url: result };
  }
}