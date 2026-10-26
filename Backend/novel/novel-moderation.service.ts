import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '../common/constants/notification.enum';

const MAX_KEYWORD_MATCHES_IN_NOTIFICATION = 5;

@Injectable()
export class NovelModerationService {
  private readonly logger = new Logger(NovelModerationService.name);

  constructor(private readonly prisma: PrismaService) {}

  //Hàm getKeywords() — lấy danh sách từ khóa
  async getKeywords() {
    return this.prisma.novelModerationKeyword.findMany({
      orderBy: { keyword: 'asc' },
    });
  }
  // Hàm addKeyword() — thêm từ khóa
  async addKeyword(keyword: string) {
    const normalizedKeyword = keyword.trim();
    if (!normalizedKeyword) {
      throw new BadRequestException('Từ khóa không được để trống');
    }

    return this.prisma.novelModerationKeyword.upsert({
      where: { keyword: normalizedKeyword },
      update: {},
      create: { keyword: normalizedKeyword },
    });
  }

  //Hàm xóa từ khóa
  async removeKeyword(id: string) {
    const result = await this.prisma.novelModerationKeyword.deleteMany({
      where: { id },
    });
    if (result.count === 0) {
      throw new NotFoundException('Không tìm thấy từ khóa cảnh báo');
    }
    return { deleted: true };
  }

  //phát hiện từ khóa và thông báo Admin
  async notifyAdminsIfContentMatches( text: string, contentTitle: string, chapterNumber: number,chapterTitle: string | null) {
    //ext	Nội dung văn bản cần kiểm tra
   //contentTitle	Tên truyện
   //chapterNumber	Số chương
   // chapterTitle	Tên chương, có thể là null

    if (!text.trim()) return;

    //Bước 2: Lấy danh sách từ khóa trong database
    const keywords = await this.prisma.novelModerationKeyword.findMany({
      select: { keyword: true },
    });
    //Bước 3: chuẩn hóa nội dung người dùng thành bình thường 
    const normalizedText = this.normalize(text);

    //BƯỚC 4: TẠO MẢNG NƠI CHỨA CÁC KEYWORD TRÙNG VỚI NỘI DUNG 
    const matchedKeywords = keywords
      .map(({ keyword }) => keyword) //duyệt các keyword thành mảng chứa các keyword
      .filter((keyword) => normalizedText.includes(this.normalize(keyword))); //giữ lại các từ khóa xuất hiện có trong nội dung 
      //map lấy mảng chứa keyword trước , sau filter giữ lại các chuỗi trùng nội dung (true)

    if (matchedKeywords.length === 0) return;

    //BƯỚC 5: TÌM XEM ADMIN CÓ TỒN TẠI KHÔNG 
    const admins = await this.prisma.user.findMany({
      where: { role: 'Admin' },
      select: { id: true },
    });
    if (admins.length === 0) {
      this.logger.warn('Novel moderation matched keywords, but no Admin accounts were found.');
      return;
    }


    const displayedKeywords = matchedKeywords.slice(0, MAX_KEYWORD_MATCHES_IN_NOTIFICATION);  
    //LẤY TỐI ĐA 5 TỪ KHÓA CÓ TRONG NỘI DÙNG TRUYỆN 
    const omittedKeywordCount = matchedKeywords.length - displayedKeywords.length;
    //ĐẾM SỐ TỪ KHÓA KHÔNG ĐƯỢC HIỂN THỊ 


    let chapterLabel: string;
    //BƯỚC 6 Đoạn này tạo ra một chuỗi chứa tên chương để sử dụng trong thông báo.
    if (chapterTitle) {
          chapterLabel = `Chương ${chapterNumber} (${chapterTitle})`;
    } else {
        chapterLabel = `Chương ${chapterNumber}`;
    } 
    const message =
      `Novel "${contentTitle}" - ${chapterLabel} có từ/cụm từ cần Admin kiểm tra: ` +
      displayedKeywords.join(', ') +
      (omittedKeywordCount > 0 ? ` và ${omittedKeywordCount} từ/cụm từ khác` : '');


    await this.prisma.notification.createMany({
      // Duyệt qua từng Admin trong mảng admins
      //map() sẽ duyệt qua từng Admin, mỗi lần duyệt tạo ra một object mới với 3 trường dữ liệu bên dưới với userId bằng id của admin được duyệt
      data: admins.map(({ id }) => ({
        userId: id,
        type: NotificationType.NovelModerationAlert,
        message,
      })),
      //map() sẽ duyệt qua từng Admin, mỗi lần duyệt tạo ra một object mới với 3 trường dữ liệu bên dưới.
    });
  }

  private normalize(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLocaleLowerCase('vi');
  }
}
