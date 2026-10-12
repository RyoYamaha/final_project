import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChapterService } from '../core/chapter/chapter.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';


@Injectable()
export class NovelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chapterService: ChapterService,
    private readonly cloudinary: CloudinaryService,
  ) { }

  /** Author/Publisher gõ text trực tiếp — không có ảnh lật trang, đọc dạng text thường */

  //SetChapterText dùng để lưu hoặc cập nhật nội dung text của 1 chapter 
  async setChapterText(chapterId: string, uploaderId: string, textBody: string) {
    const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter) throw new BadRequestException('Không tìm thấy Chapter');
    await this.chapterService.verifyOwnership(chapter.contentId, uploaderId);  //kiểm tra xem người dùng có quyền chỉnh sửa hay không 

    const result = await this.prisma.chapterContent.upsert({
      where: { chapterId },
      update: { textBody },
      create: { chapterId, textBody },
    });

    await this.prisma.chapter.update({
      where: { id: chapterId },
      data: { moderationStatus: 'PendingReview', publishedAt: null },
    });

    return result;
  }

  //method dùng để xử lý pdf của 1 chapter, chuyển pdf thành từng trang và trích xuất text để lưu cho Ai 
  async setChapterFromPdf(chapterId: string, uploaderId: string, pdfBuffer: Buffer) { //pdfBuffer là nội dung file pdf dưới dạng buffer 
    const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter) throw new BadRequestException('Không tìm thấy Chapter');
    await this.chapterService.verifyOwnership(chapter.contentId, uploaderId);



    // pdf-img-convert pairs pdf.js with node-canvas. In this Node runtime pdf.js
    // resolves @napi-rs/canvas, so mixing the two canvas implementations makes
    // embedded PDF images fail the canvas type check.
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const { createCanvas } = require('@napi-rs/canvas');
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
    const pngPages: Buffer[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const initialViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(2000 / initialViewport.width, 2000 / initialViewport.height);
      const viewport = page.getViewport({ scale });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      pngPages.push(canvas.toBuffer('image/png'));
      canvas.width = 0;
      canvas.height = 0;
    }
    await pdf.destroy();


    const uploadedUrls = await Promise.all(
      pngPages.map((page) =>
        this.cloudinary.uploadImage(page, `novamanga/novel-chapters/${chapterId}`),
      ),
    );

    await this.prisma.$transaction([
      this.prisma.chapterPage.deleteMany({
        where: { chapterId },
      }),
      this.prisma.chapterPage.createMany({
        data: uploadedUrls.map((imageUrl, index) => ({
          chapterId,
          pageNumber: index + 1,
          imageUrl,
        })),
      }),
    ]);

    await this.prisma.chapter.update({
      where: { id: chapterId },
      data: { moderationStatus: 'PendingReview', publishedAt: null },
    });

    return { pagesCreated: uploadedUrls.length };
  }

  /** Reader dùng — lấy ảnh từng trang để lật (Chapter nào upload từ PDF mới có) */
  async getChapterPages(chapterId: string) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { moderationStatus: true },
    });
    if (!chapter || chapter.moderationStatus !== 'Published') {
      throw new NotFoundException('Chapter không tồn tại hoặc chưa được xuất bản');
    }
    return this.prisma.chapterPage.findMany({
      where: { chapterId },
      orderBy: { pageNumber: 'asc' },
    });
  }

  /** Reader dùng — lấy text thường (Chapter nào gõ tay text mới có) */
  async getChapterText(chapterId: string) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { moderationStatus: true },
    });
    if (!chapter || chapter.moderationStatus !== 'Published') {
      throw new NotFoundException('Chapter không tồn tại hoặc chưa được xuất bản');
    }
    const content = await this.prisma.chapterContent.findUnique({ where: { chapterId } });
    if (!content) throw new BadRequestException('Chapter chưa có nội dung text');
    return content;
  }

  /** Author dùng — lấy text chapter kể cả khi đang PendingReview */
  async getChapterTextForAuthor(chapterId: string, uploaderId: string) {
    const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter) throw new NotFoundException('Không tìm thấy Chapter');
    await this.chapterService.verifyOwnership(chapter.contentId, uploaderId);
    const content = await this.prisma.chapterContent.findUnique({ where: { chapterId } });
    // Trả về object rỗng thay vì lỗi nếu chưa có nội dung
    return content ?? { chapterId, textBody: '' };
  }

  /** Author dùng — lấy pages manga chapter kể cả khi đang PendingReview */
  async getChapterPagesForAuthor(chapterId: string, uploaderId: string) {
    const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter) throw new NotFoundException('Không tìm thấy Chapter');
    await this.chapterService.verifyOwnership(chapter.contentId, uploaderId);
    return this.prisma.chapterPage.findMany({
      where: { chapterId },
      orderBy: { pageNumber: 'asc' },
    });
  }

}
