import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChapterService } from '../core/chapter/chapter.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';

export interface UploadedImageFile {
  buffer: Buffer;
}

@Injectable()
export class MangaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chapterService: ChapterService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /** Upload nhiều ảnh cho 1 Chapter, giữ đúng thứ tự trang */
  async uploadChapterPages(chapterId: string, uploaderId: string, files: UploadedImageFile[]) {
    if (!files?.length) {
      throw new BadRequestException('Phải tải lên ít nhất một ảnh cho Chapter');
    }

    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
    });
    if (!chapter) throw new NotFoundException('Không tìm thấy Chapter');
    await this.chapterService.verifyOwnership(chapter.contentId, uploaderId);

    const lastPage = await this.prisma.chapterPage.findFirst({
      where: { chapterId },
      orderBy: { pageNumber: 'desc' },
      select: { pageNumber: true },
    });
    const firstPageNumber = (lastPage?.pageNumber ?? 0) + 1;

    const uploadedUrls = await Promise.all(
      files.map((file) => this.cloudinary.uploadImage(file.buffer, `novamanga/chapters/${chapterId}`)),
    );

    const pages = await this.prisma.$transaction(
      uploadedUrls.map((imageUrl, index) =>
        this.prisma.chapterPage.create({
          data: { chapterId, pageNumber: firstPageNumber + index, imageUrl },
        }),
      ),
    );

    return pages;
  }

  async getChapterPages(chapterId: string) {
    return this.prisma.chapterPage.findMany({
      where: { chapterId },
      orderBy: { pageNumber: 'asc' },
    });
  }
}