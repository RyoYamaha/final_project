import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContentDto } from './dto/create-content.dto';
import { QueryContentDto } from './dto/query-content.dto';
import { OwnershipTier, PublicationStatus } from '../../common/constants/content.enum';
import {NotificationService} from '../../notification/notification.service'

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService, private readonly notificationservice: NotificationService) {}

  async createContent(params: { //tham số đầu vào cho function này phải bao gồm như dưới
    dto: CreateContentDto;
    uploaderId: string;
    ownershipTier: OwnershipTier;
    publisherId?: string;
    parentContentId?: string;
  }) {
    const { dto, uploaderId, ownershipTier, publisherId, parentContentId } = params; //lấy tham số được nạp vào gán vào params, 
    //const là từ khóa khai báo 1 biến không thể gán sang giá trị khác (ở đây biến là gì, có thấy ghi tên biến đâu )

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
        genres: dto.genreIds //tạo genre
          ? { create: dto.genreIds.map((genreId) => ({ genreId })) } 
          : undefined,
        tags: dto.tagIds //tạo tag
          ? { create: dto.tagIds.map((tagId) => ({ tagId })) }
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
      // Reader chỉ nên thấy Content Published — filter publicationStatus mặc định ở controller layer,
      // ở đây cho phép truyền vào để Admin xem được Draft/PendingApproval khi cần
      ...(query.publicationStatus && { publicationStatus: query.publicationStatus }),
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
        chapters: { orderBy: { number: 'asc' } },
        uploader: { select: { id: true, username: true } },
        publisher: true,
        parentContent: { select: { id: true, title: true } },
      },
    });

    if (!content) throw new NotFoundException('Không tìm thấy Content');
    return content;
  }

  /** Chỉ Admin gọi — duyệt Content từ PendingApproval -> Published */
  async approve(id: string) {
    return this.updateStatusGuarded(id, PublicationStatus.PendingApproval, PublicationStatus.Published);
  }
  // hàm approve, khi admin approve,gán id, đổi trạng thái của publicationstatus  và publicationstatus 

  /** Chỉ Admin gọi */
  async reject(id: string) {
    return this.updateStatusGuarded(id, PublicationStatus.PendingApproval, PublicationStatus.Rejected);
  }
  //ch

  async hide(id: string) {
    return this.updateStatusGuarded(id, PublicationStatus.Published, PublicationStatus.Hidden);
  }

  async restore(id: string) {
    return this.updateStatusGuarded(id, PublicationStatus.Hidden, PublicationStatus.Published);
  }

  /** Author/Publisher resubmit sau khi bị Reject */
  async resubmit(id: string, uploaderId: string) {
    const content = await this.prisma.content.findUnique({ where: { id } });
    if (!content) throw new NotFoundException('Không tìm thấy Content');
    if (content.uploaderId !== uploaderId) { //kiểm tra đúng người upload 
      throw new ForbiddenException('Không có quyền resubmit Content này');
    }
    if (content.publicationStatus !== PublicationStatus.Rejected) { //kiểmt tra xem trạng thái có đúng là reject 
      throw new ForbiddenException('Chỉ resubmit được Content đang ở trạng thái Rejected');
    }
    return this.prisma.content.update({ //đổi trạng thái của content 
      where: { id },
      data: { publicationStatus: PublicationStatus.PendingApproval },
    });
  }

  private async updateStatusGuarded(id: string, fromStatus: PublicationStatus, toStatus: PublicationStatus) {
    const content = await this.prisma.content.findUnique({ where: { id } });
    if (!content) throw new NotFoundException('Không tìm thấy Content');

    if (content.publicationStatus !== fromStatus) {
      throw new ForbiddenException(
        `Content phải ở trạng thái ${fromStatus} mới chuyển sang ${toStatus} được (hiện tại: ${content.publicationStatus})`,
      );
    }

    return this.prisma.content.update({
      where: { id },
      data: { publicationStatus: toStatus },
    });
  }
  private async safeNotify(userId: string, type: string, message: string){
    try{
    const notification = await this.notificationservice.create(userId, type as any, message);
    }
    catch{
      console.error('Failed to create notification');
    }
  }
}