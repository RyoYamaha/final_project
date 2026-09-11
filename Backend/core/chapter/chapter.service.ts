import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateChapterDto } from './dto/create-chapter.dto';

@Injectable()
export class ChapterService {
  constructor(private readonly prisma: PrismaService) {}

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
    if (existing) throw new ForbiddenException(`Chapter số ${dto.number} đã tồn tại`);

    return this.prisma.chapter.create({
      data: {
        contentId,
        number: dto.number,
        title: dto.title,
        moderationStatus: 'Published',
        publishedAt: new Date(),
      },
    });
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

  async flagForReview(chapterId: string) {
    return this.prisma.chapter.update({
      where: { id: chapterId },
      data: { moderationStatus: 'PendingReview' },
    });
  }

  async clearReview(chapterId: string) {
    return this.prisma.chapter.update({
      where: { id: chapterId },
      data: { moderationStatus: 'Published' },
    });
  }

  async hide(chapterId: string) {
    return this.prisma.chapter.update({
      where: { id: chapterId },
      data: { moderationStatus: 'Hidden' },
    });
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