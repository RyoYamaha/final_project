import { BadRequestException, Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { NotificationService } from '../../notification/notification.service';
import { NotificationType } from '../../common/constants/notification.enum';

@Injectable()
export class ChapterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /** Dùng chung cho cả Manga và Novel — chỉ tạo khung Chapter, nội dung (ảnh/text) gắn sau */
  async createChapter(contentId: string, uploaderId: string, dto: CreateChapterDto) {
    const content = await this.prisma.content.findUnique({ where: { id: contentId } });
    if (!content) throw new NotFoundException('Không tìm thấy Content');
    if (content.uploaderId !== uploaderId) {
      throw new ForbiddenException('Không có quyền thêm Chapter cho Content này');
    }

    const existing = await this.prisma.chapter.findUnique({
      where: { contentId_number: { contentId, number: dto.number } },
    });
    if (existing) throw new ConflictException(`Chapter số ${dto.number} đã tồn tại`);

    return this.prisma.chapter.create({
      data: {
        contentId,
        number: dto.number,
        title: dto.title,
        moderationStatus: 'PendingReview',
      },
    });
  }

  async approvePendingChapter(chapterId: string) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        chapterContent: { select: { textBody: true } },
        _count: { select: { pages: true } },
        content: { select: { id: true, title: true } },
      },
    });
    if (!chapter) throw new NotFoundException('Không tìm thấy Chapter');
    if (chapter.moderationStatus !== 'PendingReview') {
      throw new ConflictException('Chapter không còn ở trạng thái chờ duyệt');
    }
    if ((!chapter.chapterContent || !chapter.chapterContent.textBody.trim()) && chapter._count.pages === 0) {
      throw new BadRequestException('Chapter chưa có nội dung để duyệt');
    }

    const publishedChapter = await this.prisma.chapter.update({
      where: { id: chapterId },
      data: { moderationStatus: 'Published', publishedAt: new Date() },
    });
    const chapterName = chapter.title
      ? `Chapter ${chapter.number}: ${chapter.title}`
      : `Chapter ${chapter.number}`;
    const notificationMessage = `${chapterName} của truyện "${chapter.content.title}" đã được đăng.`;
    await this.notificationService.notifyReadersWhoSavedContent(
      chapter.content.id,
      NotificationType.ChapterPublished,
      notificationMessage,
    );
    return publishedChapter;
  }

  async rejectPendingChapter(chapterId: string) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { content: { select: { title: true, uploaderId: true } } },
    });
    if (!chapter) throw new NotFoundException('Không tìm thấy Chapter');
    if (chapter.moderationStatus !== 'PendingReview') {
      throw new ConflictException('Chapter không còn ở trạng thái chờ duyệt');
    }

    const rejectedChapter = await this.prisma.chapter.update({
      where: { id: chapterId },
      data: { moderationStatus: 'Hidden', publishedAt: null },
    });
    const chapterName = chapter.title
      ? `Chapter ${chapter.number}: ${chapter.title}`
      : `Chapter ${chapter.number}`;
    const notificationMessage = `${chapterName} của truyện "${chapter.content.title}" chưa được duyệt.`;
    await this.notificationService.create(
      chapter.content.uploaderId,
      NotificationType.ChapterRejected,
      notificationMessage,
    );
    return rejectedChapter;
  }

  async updateChapter(chapterId: string, uploaderId: string, dto: UpdateChapterDto) {
    const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter) throw new NotFoundException('Không tìm thấy Chapter');
    await this.verifyOwnership(chapter.contentId, uploaderId);

    if (dto.number !== undefined && dto.number !== chapter.number) {
      const existing = await this.prisma.chapter.findUnique({
        where: { contentId_number: { contentId: chapter.contentId, number: dto.number } },
      });
      if (existing) throw new ForbiddenException(`Chapter số ${dto.number} đã tồn tại`);
    }

    const dataToUpdate: any = {};

    if (dto.number !== undefined) {
      dataToUpdate.number = dto.number;
    }
    if (dto.title !== undefined) {
      dataToUpdate.title = dto.title;
    }

    // Đưa chapter về trạng thái chờ duyệt lại sau khi tác giả chỉnh sửa
    dataToUpdate.moderationStatus = 'PendingReview';
    dataToUpdate.publishedAt = null;

    await this.prisma.chapter.update({
      where: { id: chapterId },
      data: dataToUpdate,
    });

    return this.prisma.chapter.findUnique({ where: { id: chapterId } });
  }

  async findByContent(contentId: string) {
    return this.prisma.chapter.findMany({
      where: { contentId, moderationStatus: { not: 'Hidden' } },
      orderBy: { number: 'asc' },
    });
  }

  async findOne(chapterId: string) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { pages: { orderBy: { pageNumber: 'asc' } }, chapterContent: true },
    });
    if (!chapter) throw new NotFoundException('Không tìm thấy Chapter');
    return chapter;
  }

  async findForAdmin(chapterId: string) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        content: {
          select: {
            id: true,
            title: true,
            type: true,
            publicationStatus: true,
          },
        },
        pages: { orderBy: { pageNumber: 'asc' } },
        chapterContent: true,
      },
    });

    if (!chapter) {
      throw new NotFoundException('Không tìm thấy Chapter');
    }

    return chapter;
  }

  async verifyOwnership(contentId: string, uploaderId: string) {
    const content = await this.prisma.content.findUnique({ where: { id: contentId } });
    if (!content) throw new NotFoundException('Không tìm thấy Content');
    if (content.uploaderId !== uploaderId) {
      throw new ForbiddenException('Không có quyền thao tác trên Content này');
    }
    return content;
  }
}
