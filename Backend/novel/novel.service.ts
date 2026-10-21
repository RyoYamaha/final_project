////////////////////////////////////////////NOVEL SERVICE/////////////////////////////////////////
//NovelService là service xử lý nội dung chapter của tiểu thuyết (novel). Nó đảm nhiệm việc lưu nội dung,
// chuyển PDF thành ảnh từng trang, trích xuất text từ PDF và cho phép Reader hoặc Author lấy nội dung chapter theo quyền tương ứng.


//////////////////////////////////////////MỤC LỤC CÁC HÀM////////////////////////////////////////////

//1. setChapterText()	Author nhập hoặc sửa nội dung chapter bằng text

//2. setChapterFromPdf()	Upload PDF, chuyển thành ảnh từng trang và trích xuất text

//3. getChapterPages()	Reader lấy ảnh từng trang để đọc

//4. getChapterText()	Reader lấy nội dung text để đọc

//5. getChapterTextForAuthor()	Author xem nội dung text, kể cả khi chưa xuất bản

//6. getChapterPagesForAuthor()	Author xem ảnh các trang, kể cả khi chưa xuất bản

//////////////////////////////////////////////////////////////////////////////////////////////////////


import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChapterService } from '../core/chapter/chapter.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { isCommunityTranslationVisible } from '../core/content/content-visibility';
import { UnlockService } from '../unlock/unlock.service';


////////////////////////////PDF TỐI ĐA 200 TRANG ////////////////////////////////////////////////////

const MAX_PDF_PAGES = 200;

//////////////////////HÀM LẤY TỪ THƯ VIỆN PDF -> XỬ LÝ PDF
const loadPdfJs = new Function(
  'return import("pdfjs-dist/legacy/build/pdf.mjs")',
) as () => Promise<typeof import('pdfjs-dist/legacy/build/pdf.mjs')>;

@Injectable()
export class NovelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chapterService: ChapterService,
    private readonly cloudinary: CloudinaryService,
    private readonly unlockService: UnlockService,
  ) { }


  ///////////////- SETCHAPTER TEXT: AUTHOR NHẬP HOẶC SỬA NỘI DUNG CHAPTER BẰNG TEXT- ///////////////////////


  async setChapterText(chapterId: string, uploaderId: string, textBody: string) {

    //BƯỚC 1: TÌM CHAPTER XEM CỐ TỒN TẠI KHÔNG
    const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter) {
      throw new BadRequestException('Không tìm thấy Chapter');
    }

    //BƯỚC 2: KIỂM TRA QUYỀN CHỈNH SỬA
    await this.chapterService.verifyOwnership(chapter.contentId, uploaderId);


    //BƯỚC 3: LƯU NỘI DUNG HOẶC TẠO NỘI DUNG MỚI THÔNG QUA UPSERT
    const result = await this.prisma.chapterContent.upsert({
      where: { chapterId },
      update: { textBody },
      create: { chapterId, textBody },
    });

    //BƯỚC 4: XÓA CÁC TRANG ẢNH CŨ

    // Giả sử trước đó Author upload PDF gồm 10 trang, hệ thống đã lưu 10 bản ghi ảnh. Sau đó Author chuyển sang nhập text trực tiếp.
    //Hàm này xóa các bản ghi ảnh của chapter đó để tránh trường hợp một chapter vừa có nội dung text mới vừa hiển thị ảnh từ PDF cũ.

    await this.prisma.chapterPage.deleteMany({ where: { chapterId } });


    //BƯỚC 5: ĐƯA VÀO TRẠNG THÁI CHỜ DUYỆT
    await this.prisma.chapter.update({ where: { id: chapterId }, data: { moderationStatus: 'PendingReview', publishedAt: null }});


    return result;
  }

  ///////////////////UPLOAD PDF VÀ CHUYỂN THÀNH HÌNH ẢNH /////////////////////////////////
  // BƯỚC 1: TÌM CHAPTER VÀ KIỂM TRA QUYỀN
  // BƯỚC 2: KIỂM TRA FILE CÓ PHẢI LÀ PDF KHÔNG
  // BƯỚC 3: NẠP PDF.JS VÀ CANVAS
  // BƯỚC 4: ĐỌC PDF VÀ XỬ LÝ LỖI
  // BƯỚC 5: GIỚI HẠN SỐ TRANG
  // BƯỚC 6: TẠO 2 MẢNG ĐỂ LƯU KẾT QUẢ
  // BƯỚC 7: DUYỆT QUA TỪNG TRANG PDF
  // BƯỚC 7.1: TẠO ĐỐI TƯỢNG ĐẠI DIỆN CHO TỪNG TRANG
  // BƯỚC 7.2: TRÍCH XUẤT TEXT CỦA TỪNG TRANG
  // BƯỚC 7.3: DUYỆT TỪNG ITEM, LẤY TEXT VÀ LOẠI BỎ GIÁ TRỊ RỖNG
  // BƯỚC 7.4: TÍNH KÍCH THƯỚC ẢNH
  // BƯỚC 7.5: TẠO CANVAS VÀ RENDER TRANG PDF THÀNH ẢNH
  // BƯỚC 7.6: CHUYỂN CANVAS THÀNH ẢNH PNG
  // BƯỚC 7.7: UPLOAD ẢNH LÊN CLOUDINARY VÀ LƯU URL VÀO MẢNG
  // BƯỚC 8: GIẢI PHÓNG TÀI NGUYÊN PDF
  // BƯỚC 9: GHÉP TEXT CỦA TẤT CẢ CÁC TRANG
  // BƯỚC 10: LƯU ẢNH VÀ TEXT VÀO DATABASE
  // BƯỚC 10.1: XÓA CÁC BẢN GHI ẢNH CŨ CỦA CHAPTER
  // BƯỚC 10.2: TẠO DANH SÁCH ẢNH MỚI
  // BƯỚC 10.3: TẠO HOẶC CẬP NHẬT NỘI DUNG TEXT CỦA CHAPTER
  // BƯỚC 11: ĐƯA CHAPTER VỀ TRẠNG THÁI CHỜ DUYỆT VÀ TRẢ KẾT QUẢ


  async setChapterFromPdf(chapterId: string, uploaderId: string, pdfBuffer: Buffer) {
    //BƯỚC 1 TÌM CHAPTER VÀ KIỂM TRA QUYỀN
    const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId } });

    if (!chapter){
      throw new BadRequestException('Không tìm thấy Chapter');
    }

    await this.chapterService.verifyOwnership(chapter.contentId, uploaderId);


    //BƯỚC 2: KIỂM TRA XEM FILE CÓ PHẢI LÀ PDF KHÔNG
    if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.toString('ascii', 0, 5) !== '%PDF-') {
      //Buffer.isBuffer(pdfBuffer): kiểm tra dữ liệu có phải kiểu Buffer không.
      //.toString('ascii', 0, 5): đọc 5 byte đầu tiên thành chuỗi.
      //!== '%PDF-': nếu không khớp dấu hiệu đầu file PDF thì từ chối.

      throw new BadRequestException('Tệp tải lên không phải là PDF hợp lệ');
    }


    //BƯỚC 3: NẠP PDF.JS VÀ CANVA


    const pdfjs = await loadPdfJs();
    //thư viện pdfjs: đọc cấu trúc pdf , lấy text và render từng trang

    const { createCanvas } = require('@napi-rs/canvas');
    //@napi-rs/canvas: Tạo vùng vẽ ảnh trong môi trường Node.js


    //BƯỚC 4: ĐỌC PDF VÀ XỬ LÝ LỖI

    let pdf: Awaited<ReturnType<typeof pdfjs.getDocument>['promise']>;


    //yêu cầu pdfjs nhận tài liệu
    try {
      pdf = await pdfjs.getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
      //Chuyển dữ liệu pdf sang dạng byte để pdfjs có thể nhận
      //.promise: đợi quá trình đọc pdf hoàn thất
    } catch {
      throw new BadRequestException('Tệp PDF bị hỏng hoặc không thể đọc');
    }

    //BƯỚC 5: GIỚI HẠN SỐ TRANG
    if (pdf.numPages > MAX_PDF_PAGES) {
      await pdf.destroy();
      //giải phóng tài nguyên của pdf.js. nó không xóa file gốc người dùng
      throw new BadRequestException(`PDF không được vượt quá ${MAX_PDF_PAGES} trang`);
    }

    //BƯỚC 6: TẠO 2 MẢNG ĐỂ LƯU KẾT QUẢ

    const uploadedUrls: string[] = []; //url ảnh từng trang sau khi trích xuất từ pdf để đẩy cloudinary
    const extractedText: string[] = []; //nội dung text được trích xuất từ từng trang PDF.

    //BƯỚC 7: DUYỆT QUA TỪNG TRANG PDF
    try {
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) { //duyệt hết trang pdf người dùng gửi lên
        //7.1 tạo đối tượng đại diện cho từng trang
        const page = await pdf.getPage(pageNumber);

         //7.2 trích xuất text của từng trang

        const textContent = await page.getTextContent();

        //7.3 duyệt qua từng text của item, loại bỏ tạp nham và lưu vào mảng

        extractedText.push( //đẩu toàn bộ itemt vào mảng đã tạo trước
          textContent.items
            .map((item) => { //duyệt từng phần tử
                if ('str' in item) { //nếu có str thì lấy nội dung text
                  return item.str;
                } else {
                  return ''; //nếu không có str trả rỗng
                }
              })
            .filter(Boolean) //loại bổ các giá trị false
            .join(' '), //ghép tất cả item thành chuỗi duy nhất ngăn cách bằng ' '

        );

        //7.4 tính kích thước ảnh

        //scale: 1: lấy kích thước tham chiếu ban đầu.\
        // 2000 / initialViewport.width: tỷ lệ để chiều rộng đạt tối đa 2000 pixel.
        // 2000 / initialViewport.height: tỷ lệ để chiều cao đạt tối đa 2000 pixel.
        // Math.min(...): chọn tỷ lệ nhỏ hơn để cả chiều rộng lẫn chiều cao không vượt quá khoảng 2000 pixel


        const initialViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(2000 / initialViewport.width, 2000 / initialViewport.height);

        //7.5 tạo và render trang thành ảnh

        //createCanvas(...): tạo một vùng vẽ có chiều rộng và chiều cao tương ứng.
        // Math.ceil(...): làm tròn kích thước lên số nguyên.
        //getContext('2d'): lấy môi trường vẽ 2D.
        // page.render(...): yêu cầu PDF.js vẽ nội dung PDF vào Canvas.
        //.promise: đợi render hoàn tất.

        const viewport = page.getViewport({ scale });

        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));

        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;


        //7.6: chuyển canvas thành ảnh png

        const pageImage = canvas.toBuffer('image/png');

        //giải phóng bộ nhớ cho hình ảnh canvas
        canvas.width = 0;
        canvas.height = 0;

        //7.7 upload ảnh lên cloudinary và push vảo mảng
        //lưu ý: hàm uploadimage sẽ trả lại một url
        uploadedUrls.push( await this.cloudinary.uploadImage(pageImage, `novamanga/novel-chapters/${chapterId}`));
      }
    } finally {
      await pdf.destroy();
    }


    //BƯỚC 9: GHÉP TEXT CỦA TẤT CẢ CÁC TRANG
    const textBody = extractedText.join('\n').trim();

    //BƯỚC 10 LƯU ẢNH VÀ TEXT VÀO DATABSE
    await this.prisma.$transaction([
      //10.1 xóa các bản ghi cũ của chapter
      this.prisma.chapterPage.deleteMany({ where: { chapterId } }),


      //10.2 tạo danh sách ảnh
      //chapterpage lúc này sẽ chứa hàng loạt các đói tưởng ảnh cùng 1 chapteId
      this.prisma.chapterPage.createMany({

        //map biến mỗi URL thành một đối tượng dữ liệu phù hợp với database.
        data: uploadedUrls.map((imageUrl, index) => ({

          chapterId,
          pageNumber: index + 1,
          imageUrl,
        })),
      }),

      //10.3 tạo hoặc update chapter mới cho content
      this.prisma.chapterContent.upsert({
        where: { chapterId },
        update: { textBody },
        create: { chapterId, textBody },
      }),
    ]);

    //BƯỚC 11: Đưa chapter về chờ duyệt và trả kết quả
    await this.prisma.chapter.update({ where: { id: chapterId }, data: { moderationStatus: 'PendingReview', publishedAt: null },});

    return { pagesCreated: uploadedUrls.length };
  }

  /** Reader dùng — lấy ảnh từng trang để lật (Chapter nào upload từ PDF mới có) */
  async getChapterPages(chapterId: string, userId?: string) {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      select: {
        number: true,
        moderationStatus: true,
        content: {
          select: {
            id: true,
            ownershipTier: true,
            pricingType: true,
            freeChapters: true,
            parentContent: {
              select: { pricingType: true, pricingChangedAt: true },
            },
          },
        },
      },
    });
    if ( !chapter || chapter.moderationStatus !== 'Published' || !isCommunityTranslationVisible(chapter.content)) {
      throw new NotFoundException('Chapter không tồn tại hoặc chưa được xuất bản');
    }
    await this.unlockService.assertChapterAccess(userId, chapter);
    return this.prisma.chapterPage.findMany({
      where: { chapterId },
      orderBy: { pageNumber: 'asc' },
    });
  }

////////////////3. GETCHAPTERPAGES() READER LẤY ẢNH TỪNG TRANG ĐỂ ĐỌC/////////////////////////
  async getChapterText(chapterId: string, userId?: string) {

    //BƯỚC 1: TRUY VẤN LẤY THÔNG TIN CẦN THIẾT
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      select: {
        number: true,
        moderationStatus: true,
        content: {
          select: {
            id: true,
            ownershipTier: true,
            pricingType: true,
            freeChapters: true,
            parentContent: {
              select: { pricingType: true, pricingChangedAt: true },
            },
          },
        },
      },
    });
    if ( !chapter || chapter.moderationStatus !== 'Published' || !isCommunityTranslationVisible(chapter.content)) {
      throw new NotFoundException('Chapter không tồn tại hoặc chưa được xuất bản');
    }

    //BƯỚC 2: KIỂM TRA QUYỀN ĐỌC TRUYỆN
    await this.unlockService.assertChapterAccess(userId, chapter);

    const content = await this.prisma.chapterContent.findUnique({ where: { chapterId } });
    if (!content) {
      throw new BadRequestException('Chapter chưa có nội dung text');
    }
    return content;
  }

  /////////////////////////5. GETCHAPTERTEXTFORAUTHOR() AUTHOR XEM NỘI DUNG TEXT, KỂ CẢ KHI CHƯA XUẤT BẢN//////////////////////


  async getChapterTextForAuthor(chapterId: string, uploaderId: string) {
    //BƯỚC 1:
    const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter) {
      throw new NotFoundException('Không tìm thấy Chapter');
    }
    await this.chapterService.verifyOwnership(chapter.contentId, uploaderId);

    //BƯỚC 2: Lấy nội dung text.
    const content = await this.prisma.chapterContent.findUnique({ where: { chapterId } });
    if (content !== null && content !== undefined) {
        return content;
      } else {
        return {
          chapterId: chapterId,
          textBody: '',
        };
      }
  }

 ////////////////////////////6. GETCHAPTERPAGESFORAUTHOR() AUTHOR XEM ẢNH CÁC TRANG, KỂ CẢ KHI CHƯA XUẤT BẢN////////////////////

  async getChapterPagesForAuthor(chapterId: string, uploaderId: string) {

    const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter){
      throw new NotFoundException('Không tìm thấy Chapter');
    }
    await this.chapterService.verifyOwnership(chapter.contentId, uploaderId);

    return this.prisma.chapterPage.findMany({
      where: { chapterId },
      orderBy: { pageNumber: 'asc' },
    });
  }

}
