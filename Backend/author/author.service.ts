import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContentService } from '../core/content/content.service';
import { CreateFanTranslationDto } from './dto/create-fan-translation.dto';
import { OwnershipTier, PublicationStatus } from '../common/constants/content.enum';

@Injectable()
export class AuthorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contentService: ContentService,
  ) {}

  /**
   * Danh sách Content Licensed để Author browse/search và chọn ra bản gốc muốn dịch.
   * Chỉ show Content đã Published (không cho dịch Content còn Draft/PendingApproval).
   */
  async browseLicensedContents(search?: string) {
    return this.prisma.content.findMany({
      where: {
        ownershipTier: OwnershipTier.Licensed,
        publicationStatus: PublicationStatus.Published,
        ...(search && { title: { contains: search } }),
      },
      select: {
        id: true,
        title: true,
        type: true,
        coverImageUrl: true,
        synopsis: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  //bản dịch do fan tự tạo 
  async createFanTranslation(userId: string, dto: CreateFanTranslationDto) {
    // Không cho tự dịch bản dịch của người khác — chỉ được dịch từ Content Licensed gốc
    const parent = await this.prisma.content.findUnique({ where: { id: dto.parentContentId } });
    if (!parent) throw new NotFoundException('Không tìm thấy Content gốc');
    if (parent.ownershipTier !== OwnershipTier.Licensed) {
      throw new ForbiddenException('Chỉ được tạo Fan Translation từ Content Licensed');
    }
    if (parent.publicationStatus !== PublicationStatus.Published) {
      throw new ForbiddenException('Content gốc chưa được duyệt, chưa thể dịch');
    }

    return this.contentService.createContent({
      dto,
      uploaderId: userId,
      ownershipTier: OwnershipTier.FanTranslation,
      parentContentId: dto.parentContentId,
      // publisherId để trống — Fan Translation không thuộc Publisher nào
    });
  }


  //tìm bản traslation theo đúng userid 
  async getMyTranslations(userId: string) {
    return this.prisma.content.findMany({
      where: { uploaderId: userId, ownershipTier: OwnershipTier.FanTranslation },
      include: { parentContent: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  //gửi lại bản translation cho admin 
  async resubmitTranslation(userId: string, contentId: string) {
    return this.contentService.resubmit(contentId, userId);
  }

  /** Author Dashboard: thống kê lượt xem/rating/bookmark — chưa có bảng view count riêng,
   *  tạm tính qua các bảng tương tác đã có (Bookmark, Rating, Comment)
   */
  async getDashboardStats(userId: string) {
    const translations = await this.prisma.content.findMany({
      where: { uploaderId: userId, ownershipTier: OwnershipTier.FanTranslation },
      select: { id: true, title: true, publicationStatus: true },
    });

    const contentIds = translations.map((t) => t.id);

    const [bookmarkCount, ratingAgg, commentCount] = await this.prisma.$transaction([ //ở đây ta thực hiện 3 truy vấn cùng lúc
      this.prisma.bookmark.count({ where: { contentId: { in: contentIds } } }), //đếm bookmark
      this.prisma.rating.aggregate({
        where: { contentId: { in: contentIds } }, //contentid nằm trong danh sách contentIds
        _avg: { score: true }, //tính điểm rating trung bình 
        _count: true, //tổng số lượt rating 
      }),
      this.prisma.comment.count({ where: { contentId: { in: contentIds } } }), //đếm comment 
    ]);

    return { //trả lại toàn bộ kết quả sau khi truy vấn 
      totalTranslations: translations.length,
      translations,
      bookmarkCount,
      averageRating: ratingAgg._avg.score ?? 0,
      ratingCount: ratingAgg._count,
      commentCount,
    };
  }
}