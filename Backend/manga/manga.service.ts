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

  ////////////////////////////////////////////////////////

  /** Upload nhiều ảnh cho 1 Chapter, giữ đúng thứ tự trang */
  async uploadChapterPages(chapterId: string, uploaderId: string, files: UploadedImageFile[]) {

    //BƯỚC 1: kiểm tra mảng file chứa các file ảnh có tồn tại ảnh nào không 
    //xác định chapter gắn với content và người dùng nào 
    //kiểm tra xem chapter có tồn tại không 

    if (!files?.length) {
      throw new BadRequestException('Phải tải lên ít nhất một ảnh cho Chapter');
    }

    const chapter = await this.prisma.chapter.findUnique({where: { id: chapterId }});
    
    if (!chapter) { 
      throw new NotFoundException('Không tìm thấy Chapter');
    }

    await this.chapterService.verifyOwnership(chapter.contentId, uploaderId);

    //BƯỚC 2: upload file lên cloudinary
    const uploadedUrls = await Promise.all(files.map((file) => this.cloudinary.uploadImage(file.buffer, `novamanga/chapters/${chapterId}`)),);
    //file.map(file) : nghĩa là duyệt từng file trong array file tham số người dùng nạp vào, gọi từng uploadimage cho nó 
    //file.buffer chứa dữ liệu được giải mã cho cloudinary có thể hiểu 
    //dòng dẫn cuối cùng xác định thư mục lưu ảnh trên cloudinary theo chapter 



    //BƯỚC 3: lưu file vào database 

    // 3.1 tìm trang cuối cùng (nguyên phần 3.1 này sử dụng cho lần upload thứ 2, khi ảnh có sẵn rồi mà cần tăng tiếp thay vì quay lại về 1)
    const lastPage = await this.prisma.chapterPage.findFirst({ where: { chapterId }, orderBy: { pageNumber: 'desc' }, 
    select: { pageNumber: true }}); 
    //findfirst: tìm chapter page có page number lớn nhất chapter hiện tại và xếp theo thứ tự giảm dần 
    //khi người dùng mới upload ảnh đầu tiên lên chapter -> nên lastpage = null 

    //3.2 tính số trang bắt đầu 
    let firstPageNumber = 1;
    

// khi giá trị last page không null , thì tức là firstpage number không nên là 1 được (nó lại cho mấy trang mới là số 1)
//vì vậy ta sẽ gọi số cuối cùng được lưu cùng pagenumber vừa được người dùng upload lên rồi + lên để số thứ tự tiếp tục chính xác
    if (lastPage !== null) {
      firstPageNumber = lastPage.pageNumber + 1;
    }
    

    //3.3 lưu các trang vào database
    const pages = await this.prisma.$transaction( uploadedUrls.map((imageUrl, index) => this.prisma.chapterPage.create({
          data: { chapterId, pageNumber: firstPageNumber + index, imageUrl }})));
          //lấy danh sách đã upload (nó sẽ bao gồm vị trí số của từng ảnh trong mảng được trả lại từ cloudinary )
          //tạo một bản ghi chapterpage cho mỗi ảnh thông qua map
          //map đơn giản là duyệt từng ảnh, thay vì dùng vòng for 
    

    //3.4 cập nhật trạng thái cho chapter 
    await this.prisma.chapter.update({ where: { id: chapterId }, data: { moderationStatus: 'PendingReview', publishedAt: null },});

    return pages;
  }

  ///////////////////////////////////////////////

  async getChapterPages(chapterId: string) {
    const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId }, select: { moderationStatus: true },});
    if (!chapter || chapter.moderationStatus !== 'Published') {
      throw new NotFoundException('Chapter không tồn tại hoặc chưa được xuất bản');
    }

    return this.prisma.chapterPage.findMany({where: { chapterId }, orderBy: { pageNumber: 'asc' },});
  }

  /** Author dùng — lấy pages kể cả khi chapter đang PendingReview */
  async getChapterPagesForAuthor(chapterId: string, uploaderId: string) {

    const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter){ 
      throw new NotFoundException('Không tìm thấy Chapter');
      }
    await this.chapterService.verifyOwnership(chapter.contentId, uploaderId);
    return this.prisma.chapterPage.findMany({ where: { chapterId }, orderBy: { pageNumber: 'asc' },});
  }

  /** Xóa 1 trang ảnh cụ thể trong Chapter */
  async deleteChapterPage(chapterId: string, pageId: string, uploaderId: string) {
    const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter) throw new NotFoundException('Không tìm thấy Chapter');
    await this.chapterService.verifyOwnership(chapter.contentId, uploaderId);

    const page = await this.prisma.chapterPage.findUnique({
      where: { id: pageId },
    });
    if (!page || page.chapterId !== chapterId) {
      throw new NotFoundException('Không tìm thấy trang ảnh này trong Chapter');
    }

    // Xóa trang khỏi database
    await this.prisma.chapterPage.delete({
      where: { id: pageId },
    });

    await this.prisma.chapter.update({
      where: { id: chapterId },
      data: { moderationStatus: 'PendingReview', publishedAt: null },
    });

    return { message: 'Đã xóa trang thành công' };
  }

  ///////////////////////////////////////////////////////////////////


  /** Cập nhật lại thứ tự các trang ảnh trong Chapter */
  async reorderChapterPages(chapterId: string, uploaderId: string, pageIds: string[]) {
    //BƯỚC 1: kiểm tra chapter exist, content, page có tồn tại không
    const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter){ 
        throw new NotFoundException('Không tìm thấy Chapter');
      }
    await this.chapterService.verifyOwnership(chapter.contentId, uploaderId);

    const existingPages = await this.prisma.chapterPage.findMany({where: { chapterId }, select: { id: true, pageNumber: true },});

    // BƯỚC 2: kiểm tra danh sách pagesId  - mảng và số lượng trang id phải bằng số trang hiện có 
    if (!Array.isArray(pageIds) || pageIds.length !== existingPages.length) {
      throw new BadRequestException('Danh sách ID trang không hợp lệ hoặc không đầy đủ');
    }
    //(!Array.isArray(pageIds): kiểm tra xem pageId có phải mảng hay không 
    //kiểm tra số id gửi len có bằng số chapter hiện có trng chpater không 

    //BƯỚC 2.1 tạo tập hợp id hiện có và tìm số trang lớn nhất

    //tạo các set để lưu id các trang hiện có của chapter 
    const existingPageIds = new Set<string>();
    //set là cấu trúc lưu dữ liệu không trùng nhau 

    //khởi tạo trang lớn nhất bằng 0
    let highestPageNumber = 0;

    //tạo tập hợp id hiện có và tìm số trang lớn nhất
    for (const page of existingPages) {
      existingPageIds.add(page.id);

      //trong vòng for so sánh lần lượt đến khi nào pagenumber lớn hơn highest
      //thì cập nhật highestpagenumber 
      if (page.pageNumber > highestPageNumber) {
        highestPageNumber = page.pageNumber;
      }
    
    }

    //BƯỚC 3: lưu các id frontend gửi lên , kiểm tra xem chúng tồn tại hay bị trùng lặp gì không 

    const requestedPageIds = new Set<string>();
    //requestpageids: lưu id mà danh sách frontend gửi lên 
    for (const pageId of pageIds) {
      //nếu id không thuộc danh sách chapter hiện tại hoặc requestPageIds đã có sẵn cái id đó rồi thì báo k hợp lệ
      if (!existingPageIds.has(pageId) || requestedPageIds.has(pageId)) {
        throw new BadRequestException('Danh sách ID trang không hợp lệ hoặc không đầy đủ');
      }

      requestedPageIds.add(pageId);
    }

    const temporaryStart = highestPageNumber + 1;
    //số trang tạm thời sau khi add thêm trang mới sẽ bắt đầu từ 4 (giả sử)

    // BƯỚC 4 chuyển tất cả các trang sang số tạm thời và đánh lại số từ 1 theo thứ tự frontend gửi 
    
    //chyển trang sang số tạm thời 
    await this.prisma.$transaction(async (transaction) => {
      for (let index = 0; index < pageIds.length; index++) {
        await transaction.chapterPage.update({
          where: { id: pageIds[index] },
          data: { pageNumber: temporaryStart + index },
        });
      }
      //gán lại số trang chính thức từ 1 theo thứ từ mà frontend gửi lên 
      for (let index = 0; index < pageIds.length; index++) {
        await transaction.chapterPage.update({
          where: { id: pageIds[index] },
          data: { pageNumber: index + 1 },
        });
      }
    });

    //BƯỚC 4:
    await this.prisma.chapter.update({ where: { id: chapterId },data: { moderationStatus: 'PendingReview', publishedAt: null },});

    return { message: 'Đã cập nhật thứ tự trang thành công' };
  }

  // API Thay thế hình ảnh của 1 trang cụ thể
  async replaceChapterPageImage(chapterId: string, pageId: string, userId: string, file: UploadedImageFile) {
    if (!file) throw new BadRequestException('Vui lòng chọn ảnh mới');
    
    const chapter = await this.prisma.chapter.findUnique({ where: { id: chapterId } });
    if (!chapter) throw new NotFoundException('Chapter không tồn tại');
    await this.chapterService.verifyOwnership(chapter.contentId, userId);

    const existing = await this.prisma.chapterPage.findUnique({ where: { id: pageId } });
    if (!existing || existing.chapterId !== chapterId) {
      throw new NotFoundException('Trang ảnh không tồn tại trong chapter này');
    }

    const newImageUrl = await this.cloudinary.uploadImage(file.buffer, `novamanga/chapters/${chapterId}`);

    await this.prisma.chapterPage.update({
      where: { id: pageId },
      data: { imageUrl: newImageUrl },
    });

    await this.prisma.chapter.update({
      where: { id: chapterId },
      data: { moderationStatus: 'PendingReview', publishedAt: null },
    });

    return { message: 'Đã thay thế ảnh thành công', newImageUrl };
  }
}