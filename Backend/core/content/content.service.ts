import { BadRequestException, Injectable, NotFoundException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContentDto } from './dto/create-content.dto';
import { QueryContentDto } from './dto/query-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { OwnershipTier, PublicationStatus } from '../../common/constants/content.enum';
import { NotificationService } from '../../notification/notification.service';
import { NotificationType } from '../../common/constants/notification.enum';

@Injectable()
export class ContentService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) { }

  async onModuleInit() {
    await this.seedDefaults();
  }

  private async seedDefaults() {
    const defaultTags = ['Magic', 'War', 'Adventure', 'School Life', 'Slice of Life', 'Comedy', 'Drama', 'Romance', 'Fantasy', 'Sci-Fi'];
    const defaultGenres = ['Action', 'Fantasy', 'Romance', 'Isekai', 'Horror', 'Mystery', 'Thriller', 'Historical'];

    for (const name of defaultTags) {
      await this.prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name }
      });
    }

    for (const name of defaultGenres) {
      await this.prisma.genre.upsert({
        where: { name },
        update: {},
        create: { name }
      });
    }
    console.log('✅ Default Genres and Tags seeded successfully from ContentService');
  }

  async createContent(dto: CreateContentDto, uploaderId: string, ownershipTier: OwnershipTier,
    publisherId?: string,
    parentContentId?: string,) {

    // Fan Translation bắt buộc có parentContentId trỏ tới Content Licensed đã tồn tại
    if (ownershipTier === OwnershipTier.FanTranslation) {
      if (!parentContentId) {
        throw new ForbiddenException('Fan Translation phải chọn Content gốc (parentContentId)');
      }
      const parent = await this.prisma.content.findUnique({ where: { id: parentContentId } });
      if (!parent || parent.ownershipTier !== OwnershipTier.Licensed) {
        throw new ForbiddenException('Content gốc không hợp lệ hoặc không phải Licensed');
      }
    }
    // Truyện người dùng đăng thì không cần parent Id 
    if (ownershipTier === OwnershipTier.Original && parentContentId) {
      throw new ForbiddenException('Truyện sáng tác gốc không được gắn Content gốc (parentContentId)');
    }

    const content = await this.prisma.content.create({
      data: {
        title: dto.title,
        synopsis: dto.synopsis,
        type: dto.type,
        ownershipTier,
        publicationStatus: PublicationStatus.PendingApproval, // mọi Content mới đều chờ Admin duyệt
        coverImageUrl: dto.coverImageUrl,
        uploaderId,
        publisherId,
        parentContentId,
        genres: dto.genreIds
          ? {
            create: dto.genreIds.map((name) => ({
              genre: {
                connect: { name },
              },
            })),
          }
          : undefined,
        tags: dto.tagIds
          ? {
            create: dto.tagIds.map((name) => ({
              tag: {
                connect: { name },
              },
            })),
          }
          : undefined,
        mangaDetail: dto.type === 'Manga' ? { create: {} } : undefined,
        novelDetail: dto.type === 'Novel' ? { create: {} } : undefined,
      },
      include: {
        genres: { include: { genre: true } },
        tags: { include: { tag: true } },
        mangaDetail: true,
        novelDetail: true,
      },
    });

    return content;
  }


  // Nhận các tham số query từ URL, tạo điều kiện lọc và lấy danh sách Content

  async findAll(query: QueryContentDto) {
    const page = query.page ?? 1; //?? nghĩa là nếu bên trái null hoặc undefined thì dùng giá trị bên phải 
    const limit = query.limit ?? 20;

    const where = {
      ...(query.type && { type: query.type }),
      ...(query.ownershipTier && { ownershipTier: query.ownershipTier }),
      // Reader chỉ nên thấy Content Published. Nếu muốn xem loại khác (VD: Admin), phải truyền query
      publicationStatus: query.publicationStatus || PublicationStatus.Published,
      ...(query.search && { title: { contains: query.search } }),
      ...(query.genreId && { genres: { some: { genreId: query.genreId } } }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.content.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          genres: { include: { genre: true } },
          tags: { include: { tag: true } },
          uploader: { select: { id: true, username: true } },
        },
      }),
      this.prisma.content.count({ where }),
    ]);

    return {
      items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  //tìm content dựa theo id 

  async findOne(id: string) {
    const content = await this.prisma.content.findUnique({
      where: { id },
      include: {
        mangaDetail: true,
        novelDetail: true,
        genres: { include: { genre: true } },
        tags: { include: { tag: true } },
        chapters: {
          orderBy: { number: 'asc' },
        },
        uploader: { select: { id: true, username: true } },
        publisher: true,
        parentContent: { select: { id: true, title: true } },
      },
    });

    if (!content) throw new NotFoundException('Không tìm thấy Content');
    return content;
  }

  // Danh mục thể loại (Genres)
  async getGenres() {
    return this.prisma.genre.findMany({ orderBy: { name: 'asc' } });
  }

  // Danh mục thẻ tag (Tags)
  async getTags() {
    return this.prisma.tag.findMany({ orderBy: { name: 'asc' } });
  }

  // Chỉnh sửa truyện (Title, Synopsis, Cover, Status, Genres, Tags)
  async updateContent(id: string, uploaderId: string, dto: UpdateContentDto) {
    const content = await this.prisma.content.findUnique({ where: { id } });
    if (!content) throw new NotFoundException('Không tìm thấy Content');
    if (content.uploaderId !== uploaderId) {
      throw new ForbiddenException('Không có quyền chỉnh sửa Content này');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.genreIds) {
        await tx.contentGenre.deleteMany({ where: { contentId: id } });
        if (dto.genreIds.length > 0) {
          const genres = await tx.genre.findMany({
            where: { name: { in: dto.genreIds } },
            select: { id: true },
          });
          await tx.contentGenre.createMany({
            data: genres.map((g) => ({ contentId: id, genreId: g.id })),
          });
        }
      }

      if (dto.tagIds) {
        await tx.contentTag.deleteMany({ where: { contentId: id } });
        if (dto.tagIds.length > 0) {
          const tags = await tx.tag.findMany({
            where: { name: { in: dto.tagIds } },
            select: { id: true },
          });
          await tx.contentTag.createMany({
            data: tags.map((t) => ({ contentId: id, tagId: t.id })),
          });
        }
      }

      const dataToUpdate: any = {};
      //tạo biến để update theo data mới của người dùng

      if (dto.title !== undefined) {
        dataToUpdate.title = dto.title;
      }
      if (dto.synopsis !== undefined) {
        dataToUpdate.synopsis = dto.synopsis;
      }
      if (dto.coverImageUrl !== undefined) {
        dataToUpdate.coverImageUrl = dto.coverImageUrl;
      }
      if (dto.storyStatus !== undefined) {
        dataToUpdate.storyStatus = dto.storyStatus;
      }

      // Đưa truyện về trạng thái chờ duyệt lại sau khi tác giả chỉnh sửa
      dataToUpdate.publicationStatus = PublicationStatus.PendingApproval;
      dataToUpdate.reviewFeedback = null;

      return tx.content.update({
        where: { id },
        data: dataToUpdate, //biến chứa toàn bộ data đã update sẽ được cập nhật ở đây
        include: {
          genres: { include: { genre: true } },
          tags: { include: { tag: true } },
          uploader: { select: { id: true, username: true } },
        },
      });
    });
  }

  /** Chỉ Admin gọi — duyệt Content từ PendingApproval -> Published */
  async approve(id: string) {
    const content = await this.updateStatusGuarded(
      id,
      PublicationStatus.PendingApproval,
      PublicationStatus.Published,
    );
    await this.createNotificationSafely(
      content.uploaderId,
      NotificationType.ContentApproved,
      `Truyện "${content.title}" đã được duyệt và xuất bản.`,
    );
    return content;
  }

  /** Chỉ Admin gọi */
  async reject(id: string, reason?: string) {
    let reviewFeedback = '';
    if (reason !== undefined) {
      reviewFeedback = reason.trim();
    }

    if (reviewFeedback.length === 0) {
      throw new BadRequestException('Vui lòng nhập lý do từ chối Content');
    }

    const content = await this.updateStatusGuarded(
      id,
      PublicationStatus.PendingApproval,
      PublicationStatus.Rejected,
      reviewFeedback,
    );

    const message = `Truyện "${content.title}" đã bị từ chối. Lý do: ${reviewFeedback}`;
    await this.createNotificationSafely(content.uploaderId, NotificationType.ContentRejected, message);
    return content;
  }

  async hide(id: string) {
    const content = await this.updateStatusGuarded(
      id,
      PublicationStatus.Published,
      PublicationStatus.Hidden,
    );
    await this.createNotificationSafely(
      content.uploaderId,
      NotificationType.ContentHidden,
      `Truyện "${content.title}" đã bị ẩn.`,
    );
    return content;
  }

  async restore(id: string) {
    const content = await this.updateStatusGuarded(
      id,
      PublicationStatus.Hidden,
      PublicationStatus.Published,
    );
    await this.createNotificationSafely(
      content.uploaderId,
      NotificationType.ContentRestored,
      `Truyện "${content.title}" đã được khôi phục.`,
    );
    return content;
  }

  /** Author/Publisher resubmit sau khi bị Reject */
  async resubmit(id: string, uploaderId: string) {
    const content = await this.prisma.content.findUnique({ where: { id } });
    if (!content) {
      throw new NotFoundException('Không tìm thấy Content');
    }

    if (content.uploaderId !== uploaderId) {
      throw new ForbiddenException('Không có quyền resubmit Content này');
    }

    if (content.publicationStatus !== PublicationStatus.Rejected) {
      throw new ForbiddenException('Chỉ resubmit được Content đang ở trạng thái Rejected');
    }

    return this.prisma.content.update({
      where: { id },
      data: { publicationStatus: PublicationStatus.PendingApproval, reviewFeedback: null },
    });
  }

  private async updateStatusGuarded(
    id: string,
    fromStatus: PublicationStatus,
    toStatus: PublicationStatus,
    reviewFeedback?: string,
  ) {
    const content = await this.prisma.content.findUnique({ where: { id } });
    if (!content) {
      throw new NotFoundException('Không tìm thấy Content');
    }

    if (content.publicationStatus !== fromStatus) {
      throw new ForbiddenException(
        `Content phải ở trạng thái ${fromStatus} mới chuyển sang ${toStatus} được (hiện tại: ${content.publicationStatus})`,
      );
    }

    const dataToUpdate: {
      publicationStatus: PublicationStatus;
      reviewFeedback?: string;
    } = {
      publicationStatus: toStatus,
    };

    if (reviewFeedback !== undefined) {
      dataToUpdate.reviewFeedback = reviewFeedback;
    }

    return this.prisma.content.update({
      where: { id },
      data: dataToUpdate,
    });
  }
  private async createNotificationSafely(userId: string, type: NotificationType, message: string) {
    try {
      await this.notificationService.create(userId, type, message);
    } catch (error) {
      console.error('Failed to create notification', error);
    }
  }
}