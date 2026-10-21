///////////////////////////////////UNLOCK SERVICE///////////////////////////////////////////////
// dùng để quản lý việc mua truyện bằng coin và kiểm tra quyền truy cập của người dùng đối với truyện hoặc chương truyện,
// đảm bảo người dùng chỉ đọc được nội dung phù hợp với quyền sở hữu và trạng thái thanh toán của mình.dùng để quản lý
// việc mua truyện bằng coin  và kiểm tra quyền truy cập của người dùng đối với truyện hoặc chương truyện
// , đảm bảo người dùng chỉ đọc được nội dung phù hợp với quyền sở hữu và trạng thái thanh toán của mình.

//////////////////////////////////MỤC LỤC CÁC HÀM////////////////////////////////////////////////

//1. purchaseContent(): Xử lý mua truyện bằng coin, kiểm tra truyện có được phát hành
// và đã mua trước đó chưa, kiểm tra loại truyện có thu phí không, trừ coin trong ví và lưu lịch sử giao dịch.

//2. getContentAccess(): Kiểm tra và trả về thông tin quyền sở hữu truyện của người dùng,
// bao gồm truyện miễn phí hay trả phí, giá coin, số chương miễn phí và trạng thái đã mua.

//3. assertChapterAccess(): Kiểm tra quyền đọc một chương truyện, cho phép đọc
// miễn phí nếu đáp ứng điều kiện hoặc yêu cầu người dùng đăng nhập và mua truyện nếu chương đó có tính phí.

//4. isUniqueConstraintError(): Kiểm tra lỗi Prisma P2002 (vi phạm ràng buộc duy nhất),
// hỗ trợ xử lý trường hợp hai yêu cầu mua cùng một truyện xảy ra đồng thời.

//5. ReadableChapter: Khai báo kiểu dữ liệu chương truyện cần thiết để kiểm tra quyền đọc,
// bao gồm số chương và thông tin sở hữu, giá truyện, số chương miễn phí.

//6. constructor(): Tiêm PrismaService vào UnlockService để các hàm có thể thao tác với cơ sở dữ liệu thông qua Prisma.

//////////////////////////////////////////////////////////////////////////////////////////////////

import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { ContentPricingType, OwnershipTier, PublicationStatus } from '../common/constants/content.enum';
import { PrismaService } from '../prisma/prisma.service';

type ReadableChapter = {
  number: number;
  content: {
    id: string;
    ownershipTier: string;
    pricingType: string;
    freeChapters: number;
  };
};

function isUniqueConstraintError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }

  if (error.code !== 'P2002') {
    return false;
  }

  return true;
}

@Injectable()
export class UnlockService {
  constructor(private readonly prisma: PrismaService) {}


////////////////////MUA CONTENT////////////////////////////

//BƯỚC 1 2 3 TÌM CONTENT, KIỂM TRA XEM ĐÃ MUA TRƯỚC ĐÂY CHƯA VÀ ĐÃ CÓ PHẢI LOẠI TRUYỆN CẦN TRẢ TIỀN HAY KHÔNG
//BƯỚC 4 : TRỪ SỐ COIN TRONG VÍ
//BƯỚC 5+6 : TẠO GIAO DỊCH + LỊCH SỬ MUA Ở VÍ TIỀN

  async purchaseContent(userId: string, contentId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        //BƯỚC 1 TÌM CONTENT CẦN MUA
        const content = await tx.content.findUnique({
          where: { id: contentId },
          select: {
            id: true,
            uploaderId: true,
            publisherId: true,
            ownershipTier: true,
            publicationStatus: true,
            pricingType: true,
            priceCoins: true,
          },
        });

        if (!content) {
          throw new NotFoundException('Không tìm thấy truyện đang được phát hành');
        }

        if (content.publicationStatus !== PublicationStatus.Published) {
          throw new NotFoundException('Không tìm thấy truyện đang được phát hành');
        }

        //BƯỚC 2: TÌM XEM ĐÃ MUA TRƯỚC ĐÂY CHƯA
        const existingPurchase = await tx.contentPurchase.findUnique({
          where: {
            userId_contentId: { userId, contentId },
          },
        });
        if (existingPurchase) {
          const wallet = await tx.wallet.findUnique({
            where: { userId },
            select: { balance: true },
          });

          let balance = 0;
          if (wallet) {
            balance = wallet.balance;
          }

          //Nếu đã mua rồi thì trả về đơn mua cũ và không trừ coin thêm lần nữa.
          return { purchase: existingPurchase, alreadyOwned: true, balance };
        }

        //BƯỚC 3: TÌM XEM TRUYỆN NÀY CÓ TRẢ TIỀN BẰNG COIN HAY KHÔNG
        if (content.ownershipTier === OwnershipTier.FanTranslation) {
          throw new BadRequestException('Fan Translation được đọc miễn phí, không cần mua');
        }

        if (content.pricingType !== ContentPricingType.Paid) {
          throw new BadRequestException('Truyện này không bán bằng coin');
        }

        if (
          !Number.isSafeInteger(content.priceCoins) ||
          content.priceCoins <= 0
        ) {
          throw new BadRequestException('Giá truyện không hợp lệ');
        }

        let creatorId = '';
        let sharePercent = 0;

        if (content.ownershipTier === OwnershipTier.Licensed) {
          if (!content.publisherId) {
            throw new BadRequestException(
              'Licensed Content chưa được liên kết với Publisher',
            );
          }

          const publisher = await tx.publisher.findUnique({
            where: { id: content.publisherId },
            select: { userId: true, verificationStatus: true },
          });

          if (!publisher || publisher.verificationStatus !== 'Approved') {
            throw new BadRequestException(
              'Publisher của Content chưa được xác minh',
            );
          }

          creatorId = publisher.userId;
          sharePercent = 80;
        } else if (content.ownershipTier === OwnershipTier.Original) {
          creatorId = content.uploaderId;
          sharePercent = 60;
        } else {
          throw new BadRequestException(
            'Loại Content này không được bán bằng coin',
          );
        }

        //BƯỚC 4: TRỪ COIN NẾU SỐ DƯ TRONG VÍ ĐỦ
        //gte có nghĩa là số dư phải lớn hơn hoặc bằng giá truyện.
        //decrement dùng để giảm số coin trong ví sau khi mua.
        const debit = await tx.wallet.updateMany({
          where: {
            userId,
            balance: { gte: content.priceCoins },
          },
          data: {
            balance: { decrement: content.priceCoins },
          },
        });

        //4.1: KIỂM TRA KẾT QUẢ TRỪ COIN
        if (debit.count !== 1) {
          //Nếu lần cập nhật ví không thành công, kiểm tra có yêu cầu mua đồng thời đã hoàn tất hay chưa.
          const concurrentPurchase = await tx.contentPurchase.findUnique({
            where: {
              userId_contentId: { userId, contentId },
            },
          });
          if (concurrentPurchase) {
            const wallet = await tx.wallet.findUnique({
              where: { userId },
              select: { balance: true },
            });

            let balance = 0;
            if (wallet) {
              balance = wallet.balance;
            }

            //Nếu yêu cầu khác đã mua thành công thì trả về kết quả cũ, không báo thiếu coin.
            return {
              purchase: concurrentPurchase,
              alreadyOwned: true,
              balance,
            };
          }

          //Nếu chưa có giao dịch mua thì số dư hiện tại không đủ.
          throw new BadRequestException('Số dư coin không đủ để mua truyện');
        }

        //BƯỚC 5: LẤY ID VÍ VÀ SỐ DƯ SAU KHI ĐÃ TRỪ COIN
        const wallet = await tx.wallet.findUniqueOrThrow({
          where: { userId },
          select: { id: true, balance: true },
        });

        //BƯỚC 6: TẠO GIAO DỊCH MUA TRUYỆN
        const purchase = await tx.contentPurchase.create({
          data: {
            userId,
            contentId,
            priceCoins: content.priceCoins,
          },
        });

        //BƯỚC 7: TÍNH VÀ GHI NHẬN PHẦN DOANH THU CỦA CREATOR VÀ WEBSITE
        //Math.floor làm tròn phần creator xuống; phần coin còn lại thuộc Website.
        const creatorCoins = Math.floor(
          (content.priceCoins * sharePercent) / 100,
        );
        const platformCoins = content.priceCoins - creatorCoins;

        await tx.creatorRevenue.create({
          data: {
            creatorId,
            purchaseId: purchase.id,
            contentId: content.id,
            grossCoins: content.priceCoins,
            sharePercent,
            creatorCoins,
            platformCoins,
          },
        });

        //BƯỚC 8: GHI LỊCH SỬ TRỪ COIN VÀO WALLETLEDGER
        //amountCoins là số âm vì đây là giao dịch chi coin.
        await tx.walletLedger.create({
          data: {
            walletId: wallet.id,
            userId,
            amountCoins: -content.priceCoins,
            balanceAfter: wallet.balance,
            transactionType: 'Purchase',
            sourceType: 'ContentPurchase',
            sourceReference: purchase.id,
            description: `Purchased content ${content.id}`,
          },
        });

        //Trả về giao dịch mua và số dư ví mới nhất.
        return { purchase, alreadyOwned: false, balance: wallet.balance };
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        //Nếu hai yêu cầu mua chạy đồng thời, khóa duy nhất chỉ cho phép lưu một giao dịch mua.
        const purchase = await this.prisma.contentPurchase.findUnique({
          where: { userId_contentId: { userId, contentId } },
        });
        if (!purchase) {
          throw error;
        }

        const wallet = await this.prisma.wallet.findUnique({
          where: { userId },
          select: { balance: true },
        });

        let balance = 0;
        if (wallet) {
          balance = wallet.balance;
        }

        //Giao dịch còn lại đã được ghi nhận thành công; trả về kết quả đó để không trừ coin lần nữa.
        return { purchase, alreadyOwned: true, balance };
      }

      throw error;
    }
  }


  ///////////////////////////HÀM KIỂM TRA QUYỀN TRUY CẬP NGƯỜI DÙNG VỚI MỘT BỘ TRUYỆN///////////////////////////

  async getContentAccess(userId: string, contentId: string) {

    //BƯỚC 1: KIỂM TRA TRUYỆN
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: {
        id: true,
        ownershipTier: true,
        publicationStatus: true,
        pricingType: true,
        priceCoins: true,
        freeChapters: true,
      },
    });


    if (!content || content.publicationStatus !== PublicationStatus.Published) {
      throw new NotFoundException('Không tìm thấy truyện đang được phát hành');
    }
    //BƯỚC 2: KIỂM TRA GIAO DỊCH MUA
    //đảm bảo đã mua
    let purchase = null;
    if (
      content.ownershipTier !== OwnershipTier.FanTranslation &&
      content.pricingType === ContentPricingType.Paid
    ) {
      purchase = await this.prisma.contentPurchase.findUnique({
      where: { userId_contentId: { userId, contentId } },
      select: { purchasedAt: true, priceCoins: true },
      });
    }

    let isFree = false;
    if (content.ownershipTier === OwnershipTier.FanTranslation) {
      isFree = true;
    } else if (content.pricingType !== ContentPricingType.Paid) {
      isFree = true;
    }

    return {
      contentId: content.id,
      isFree,
      priceCoins: content.priceCoins,
      freeChapters: content.freeChapters,
      isOwned: purchase !== null,
      purchase,
    };
  }


  ////////////////////////////KIỂM TRA XEM NGƯỜI DÙNG CÓ QUYỀN ĐỌC CHAPTER ĐÓ KHÔNG///////////////////////

  //BƯỚC 1: LỌC NHỮNG NGƯỜI DÙNG ĐỌC TRUYỆN FREE
  //BƯỚC 2,3: KIỂM TRA NGƯỜI DÙNG ĐÃ MUA TRUYỆN VÀ CÓ QUYỀN ĐỌC BỘ ĐÓ KHÔNG

  async assertChapterAccess(userId: string | undefined, chapter: ReadableChapter) {

    //BƯỚC 1: KIỂM TRA CHAPTER CÓ ĐƯỢC ĐỌC MIÊN PHÍ HAY KHÔNG
    //là fantrasnlation , hoặc không phải trả tiền , hoặc chapter nằm trong số chapter free

    if (chapter.content.ownershipTier === OwnershipTier.FanTranslation) {
      return;
    }

    if (chapter.content.pricingType !== ContentPricingType.Paid) {
      return;
    }

    if (chapter.number <= chapter.content.freeChapters) {
      return;
    }

    //BƯỚC 2: KIỂM TRA NGƯỜI DÙNG XEM ĐĂNG NHẬP CHƯA (NẾU TRUYỆN PHẢI TRẢ TIỀN)
    if (!userId) {
      throw new UnauthorizedException('Đăng nhập và mua truyện để đọc chapter này');
    }

    //BƯỚC 3: KIỂM TRA XEM CÓ GIAO DỊCH MUA TRƯỚC ĐÂY CHƯA
    const purchase = await this.prisma.contentPurchase.findUnique({
      where: { userId_contentId: { userId, contentId: chapter.content.id } },
      select: { id: true },
    });
    if (!purchase) {
      throw new ForbiddenException('Bạn cần mua toàn bộ truyện để đọc chapter này');
    }
  }
}
