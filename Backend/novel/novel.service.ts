import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChapterService } from '../core/chapter/chapter.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { pdfToPng } from 'pdf-to-png-converter';
// @ts-ignore — pdf-parse không có type export chuẩn ESM
const pdfParse = require('pdf-parse');

@Injectable()
export class NovelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chapterService: ChapterService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /** Author/Publisher gõ text trực tiếp — không có ảnh lật trang, đọc dạng text thường */

  //SetChapterText dùng để lưu hoặc cập nhật nội dung text của 1 chapter 
  async setChapterText(chapterId: string, uploaderId: string, textBody: string) {
    const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter) throw new BadRequestException('Không tìm thấy Chapter');
    await this.chapterService.verifyOwnership(chapter.contentId, uploaderId);  //kiểm tra xem người dùng có quyền chỉnh sửa hay không 

    return this.prisma.chapterContent.upsert({ //upsert nghĩa làn nếu chapter có content sẵn rồi thì update , còn không thì tự tạo 1 bản ghi mới 
      where: { chapterId },
      update: { textBody },
      create: { chapterId, textBody },
    });
  }

//method dùng để xử lý pdf của 1 chapter, chuyển pdf thành từng trang và trích xuất text để lưu cho Ai 
  async setChapterFromPdf(chapterId: string, uploaderId: string, pdfBuffer: Buffer) { //pdfBuffer là nội dung file pdf dưới dạng buffer 
    const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter) throw new BadRequestException('Không tìm thấy Chapter');
    await this.chapterService.verifyOwnership(chapter.contentId, uploaderId);

    const parsed = await pdfParse(pdfBuffer);
    const textBody = parsed.text?.trim();
    if (!textBody) {
      throw new BadRequestException(
        'PDF không chứa text layer (có thể là bản scan) — AI cần text để xử lý, vui lòng upload lại file gốc',
      );
    }

    const pngPages = await pdfToPng(pdfBuffer, { viewportScale: 2.0 });

    const uploadedUrls = await Promise.all(
      pngPages.map((page) =>
        this.cloudinary.uploadImage(page.content, `novamanga/novel-chapters/${chapterId}`),
      ),
    );

    await this.prisma.$transaction([
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

    return { pagesCreated: uploadedUrls.length, hasTextForAI: true };
  }

  /** Reader dùng — lấy ảnh từng trang để lật (Chapter nào upload từ PDF mới có) */
  async getChapterPages(chapterId: string) {
    return this.prisma.chapterPage.findMany({
      where: { chapterId },
      orderBy: { pageNumber: 'asc' },
    });
  }

  /** Reader dùng — lấy text thường (Chapter nào gõ tay text mới có) */
  async getChapterText(chapterId: string) {
    const content = await this.prisma.chapterContent.findUnique({ where: { chapterId } });
    if (!content) throw new BadRequestException('Chapter chưa có nội dung text');
    return content;
  }


  async getChapterTextForAI(chapterId: string): Promise<string> {
    const content = await this.prisma.chapterContent.findUnique({ where: { chapterId } });
    return content?.textBody ?? '';
  }
}