import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChapterService } from '../core/chapter/chapter.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { isCommunityTranslationVisible } from '../core/content/content-visibility';

const MAX_PDF_PAGES = 200;
const loadPdfJs = new Function(
  'return import("pdfjs-dist/legacy/build/pdf.mjs")',
) as () => Promise<typeof import('pdfjs-dist/legacy/build/pdf.mjs')>;

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
    await this.prisma.chapterPage.deleteMany({ where: { chapterId } });

    await this.prisma.chapter.update({
      where: { id: chapterId },
      data: { moderationStatus: 'PendingReview', publishedAt: null },
    });

    return result;
  }

  // Render PDF pages and preserve extractable text for AI features.
  async setChapterFromPdf(chapterId: string, uploaderId: string, pdfBuffer: Buffer) {
    const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter) throw new BadRequestException('Không tìm thấy Chapter');
    await this.chapterService.verifyOwnership(chapter.contentId, uploaderId);

    if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.toString('ascii', 0, 5) !== '%PDF-') {
      throw new BadRequestException('Tệp tải lên không phải là PDF hợp lệ');
    }

    const pdfjs = await loadPdfJs();
    const { createCanvas } = require('@napi-rs/canvas');
    let pdf: Awaited<ReturnType<typeof pdfjs.getDocument>['promise']>;
    try {
      pdf = await pdfjs.getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
    } catch {
      throw new BadRequestException('Tệp PDF bị hỏng hoặc không thể đọc');
    }
    if (pdf.numPages > MAX_PDF_PAGES) {
      await pdf.destroy();
      throw new BadRequestException(`PDF không được vượt quá ${MAX_PDF_PAGES} trang`);
    }

    const uploadedUrls: string[] = [];
    const extractedText: string[] = [];
    try {
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        extractedText.push(
          textContent.items
            .map((item) => ('str' in item ? item.str : ''))
            .filter(Boolean)
            .join(' '),
        );

        const initialViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(2000 / initialViewport.width, 2000 / initialViewport.height);
        const viewport = page.getViewport({ scale });
        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        const pageImage = canvas.toBuffer('image/png');
        canvas.width = 0;
        canvas.height = 0;
        uploadedUrls.push(
          await this.cloudinary.uploadImage(pageImage, `novamanga/novel-chapters/${chapterId}`),
        );
      }
    } finally {
      await pdf.destroy();
    }

    const textBody = extractedText.join('\n').trim();
    await this.prisma.$transaction([
      this.prisma.chapterPage.deleteMany({ where: { chapterId } }),
      this.prisma.chapterPage.createMany({
        data: uploadedUrls.map((imageUrl, index) => ({
          chapterId,
          pageNumber: index + 1,
          imageUrl,
        })),
      }),
      this.prisma.chapterContent.upsert({
        where: { chapterId },
        update: { textBody },
        create: { chapterId, textBody },
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
      select: {
        moderationStatus: true,
        content: {
          select: {
            ownershipTier: true,
            parentContent: {
              select: { pricingType: true, pricingChangedAt: true },
            },
          },
        },
      },
    });
    if (
      !chapter ||
      chapter.moderationStatus !== 'Published' ||
      !isCommunityTranslationVisible(chapter.content)
    ) {
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
      select: {
        moderationStatus: true,
        content: {
          select: {
            ownershipTier: true,
            parentContent: {
              select: { pricingType: true, pricingChangedAt: true },
            },
          },
        },
      },
    });
    if (
      !chapter ||
      chapter.moderationStatus !== 'Published' ||
      !isCommunityTranslationVisible(chapter.content)
    ) {
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
