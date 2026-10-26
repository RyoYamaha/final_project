import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { ContentPricingType, OwnershipTier, PublicationStatus } from '../../common/constants/content.enum';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContentValidationService {
  // Khởi tạo service với PrismaService để truy vấn dữ liệu cần kiểm tra.
  constructor(private readonly prisma: PrismaService) {}

  // Các hàm kiểm tra và chuẩn bị dữ liệu chỉ dùng trong createContent().
  // Kiểm tra đầu vào khi tạo Content theo loại sở hữu và quan hệ với Content gốc.
  validateCreateContentInput(
    contentData: CreateContentDto,
    ownershipTier: OwnershipTier,
    parentContentId?: string,
  ) {
    //BƯỚC 1 KIỂM TRA CÓ PHẢI TRUYỆN FAN TRANSLATION 
    //Bước 1.1: set up truyện cha mẹ là rỗng vì ban đầu tạo truyện thì làm gì có truyện gốc \
    //BƯỚC 1.4 NẾU TRUYỆN TRANSLATION MÀ SET UP KHÔNG MIỄN PHÍ THÌ NÉM LỖI 
    if (
      ownershipTier === OwnershipTier.FanTranslation &&
      ((contentData.pricingType !== undefined &&
        contentData.pricingType !== ContentPricingType.Free) ||
        (contentData.priceCoins !== undefined && contentData.priceCoins !== 0) ||
        contentData.allowCommunityTranslation === true)
    ) {
      throw new BadRequestException('Fan Translation phải miễn phí và không thể bật dịch cộng đồng');
    }

    //BƯỚC 2: KIỂM TRA TRUYỆN ORIGINAL 
    //BƯỚC 2.1: NẾU TRUYỆN LÀ TRUYỆN GỐC MÀ KÈM PARENTCONTENTID
    //BÁO LỖI 
    if (ownershipTier === OwnershipTier.Original && parentContentId) {
      throw new ForbiddenException('Truyện sáng tác gốc không được gắn Content gốc (parentContentId)');
    }

    if (
      contentData.allowCommunityTranslation === true &&
      ownershipTier !== OwnershipTier.Licensed
    ) {
      throw new BadRequestException(
        'Chỉ Licensed Content mới có thể bật dịch cộng đồng',
      );
    }
  }

  // Chuẩn hóa các thiết lập giá, số chương miễn phí và quyền dịch cộng đồng khi tạo Content.
  prepareCreateContentSettings( contentData: CreateContentDto, ownershipTier: OwnershipTier,) {

    let pricingType = ContentPricingType.Free;
    if (ownershipTier !== OwnershipTier.FanTranslation) {
      if (contentData.pricingType !== undefined) {
        pricingType = contentData.pricingType;
      }
    }

    let priceCoins = 0;
    if ( ownershipTier !== OwnershipTier.FanTranslation && pricingType === ContentPricingType.Paid) {

      if (contentData.priceCoins !== undefined) {
        priceCoins = contentData.priceCoins;
      }
    }

    let freeChapters = 3;

    if (ownershipTier === OwnershipTier.FanTranslation) {
      freeChapters = 0;
    } else {
      if (contentData.freeChapters !== undefined) {
        freeChapters = contentData.freeChapters;
      }
    }

    let allowCommunityTranslation = false;
    if (ownershipTier === OwnershipTier.Licensed) {
      if (contentData.allowCommunityTranslation === true) {
        allowCommunityTranslation = true;
      }
    }

    this.validateCreateContentSettings(
      pricingType,
      priceCoins,
      freeChapters,
      allowCommunityTranslation,
    );

    return {
      pricingType,
      priceCoins,
      freeChapters,
      allowCommunityTranslation,
    };
  }

  // Kiểm tra tính hợp lệ của các thiết lập đã chuẩn hóa trước khi tạo Content.
  private validateCreateContentSettings(
    pricingType: ContentPricingType,
    priceCoins: number,
    freeChapters: number,
    allowCommunityTranslation: boolean,
  ) {
    this.validateContentPricing(pricingType, priceCoins, freeChapters);
    if (
      allowCommunityTranslation &&
      pricingType !== ContentPricingType.Free
    ) {
      throw new BadRequestException(
        'Chỉ có thể bật dịch cộng đồng khi Content đang miễn phí',
      );
    }
  }

  // Kiểm tra các điều kiện cần truy vấn database trong transaction trước khi tạo Content.
  async validateCreateContentTransactionRules( transactionClient: Prisma.TransactionClient, uploaderId: string, ownershipTier: OwnershipTier,
    publisherId?: string, parentContentId?: string, pricingType?: ContentPricingType,
  ) {
    if (ownershipTier === OwnershipTier.FanTranslation) {
      //Bước 1.2: nếu truyện là truyện translation mà không có truyện gốc thì ném lỗi 
      if (!parentContentId) {
        throw new ForbiddenException('Fan Translation phải chọn Content gốc (parentContentId)');
      }

      //BƯỚC 1.3 Kiểm tra trạng thái Content gốc trong transaction trước khi tạo
      //BƯỚC 1.3 : PARENTID CÓ TỒN TẠI THÌ TÌM XEM TRUYỆN CHA MẸ CÓ TỒN TẠI KHÔNG
      //NẾU KHÔNG HỢP LỆ THÌ CHẢ VỀ CÁC LỖI RIÊNG 
      const currentParent = await transactionClient.content.findUnique({
        where: { id: parentContentId },
        select: {
          ownershipTier: true,
          publicationStatus: true,
          pricingType: true,
          allowCommunityTranslation: true,
        },
      });
      if ( !currentParent || currentParent.ownershipTier !== OwnershipTier.Licensed || currentParent.publicationStatus !== PublicationStatus.Published ||
        currentParent.pricingType !== ContentPricingType.Free || !currentParent.allowCommunityTranslation) {
        throw new ForbiddenException(
          'Content gốc hiện không cho phép tạo Fan Translation',
        );
      }
    }

    //BƯỚC 2.2: 
    if (ownershipTier === OwnershipTier.Licensed) {
      if (!publisherId) {
        throw new ForbiddenException('Licensed Content phải thuộc Publisher đã xác minh');
      }

      const currentPublisher = await transactionClient.publisher.findUnique({
        where: { id: publisherId },
        select: { userId: true, verificationStatus: true },
      });
      if (
        !currentPublisher ||
        currentPublisher.userId !== uploaderId ||
        currentPublisher.verificationStatus !== 'Approved'
      ) {
        throw new ForbiddenException(
          'Chỉ Publisher đã xác minh mới được tạo Licensed Content',
        );
      }
    }

    if (pricingType === ContentPricingType.Paid) {
      await this.validateContentPayoutProfile(transactionClient, uploaderId);
    }
  }

  // Kiểm tra loại giá, số coin và số chương miễn phí của Content.
  validateContentPricing(
    pricingType: string,
    priceCoins: number,
    freeChapters: number,
  ) {
    if (
      pricingType !== ContentPricingType.Free &&
      pricingType !== ContentPricingType.Paid
    ) {
      throw new BadRequestException('pricingType không hợp lệ');
    }

    if (
      !Number.isSafeInteger(freeChapters) ||
      freeChapters < 0 ||
      freeChapters > 2_147_483_647
    ) {
      throw new BadRequestException('freeChapters phải là số nguyên không âm');
    }

    if (pricingType === ContentPricingType.Free && priceCoins !== 0) {
      throw new BadRequestException('Content miễn phí phải có giá bằng 0 coin');
    }

    if (
      pricingType === ContentPricingType.Paid &&
      (!Number.isSafeInteger(priceCoins) ||
        priceCoins <= 0 ||
        priceCoins > 2_147_483_647)
    ) {
      throw new BadRequestException(
        'Content trả phí phải có giá từ 1 coin trở lên',
      );
    }
  }

  // Đảm bảo người đăng đã khai báo đầy đủ thông tin nhận tiền khi tạo Content trả phí.
  async validateContentPayoutProfile(
    transactionClient: Prisma.TransactionClient,
    userId: string,
  ) {
    const payoutProfile = await transactionClient.payoutProfile.findUnique({
      where: { userId },
      select: {
        bankName: true,
        bankBin: true,
        bankAccountNumber: true,
        bankAccountName: true,
      },
    });

    if (!payoutProfile || !payoutProfile.bankName.trim() || !payoutProfile.bankBin.trim() || !payoutProfile.bankAccountNumber.trim() ||
      !payoutProfile.bankAccountName.trim()) {

      throw new BadRequestException('Vui lòng hoàn tất thông tin tài khoản nhận tiền trong mục Doanh thu và rút coin trước khi đăng truyện trả phí',);
    }
  }

  // Kiểm tra quyền và các quy tắc giá, dịch cộng đồng khi cập nhật Content.
  async validateUpdateContent( content: {
      uploaderId: string;
      ownershipTier: string;
    }, uploaderId: string, updateData: UpdateContentDto, nextPricingType: string, nextPriceCoins: number, nextFreeChapters: number,) {

    if (content.uploaderId !== uploaderId) {
      throw new ForbiddenException('Không có quyền chỉnh sửa Content này');
    }
    if ( updateData.allowCommunityTranslation !== undefined && typeof updateData.allowCommunityTranslation !== 'boolean'
    ) {
      throw new BadRequestException('allowCommunityTranslation phải là boolean');
    }

    if (content.ownershipTier === OwnershipTier.FanTranslation) {

      if ((updateData.pricingType !== undefined && updateData.pricingType !== ContentPricingType.Free) ||
        (updateData.priceCoins !== undefined && updateData.priceCoins !== 0) ||updateData.allowCommunityTranslation === true) {

        throw new BadRequestException(
          'Fan Translation phải miễn phí và không thể bật dịch cộng đồng',
        );
      }
    }

    this.validateContentPricing( nextPricingType, nextPriceCoins,nextFreeChapters,);

    if ( updateData.priceCoins !== undefined && nextPricingType === ContentPricingType.Free &&updateData.priceCoins !== 0) {

      throw new BadRequestException('Content miễn phí phải có giá bằng 0 coin');
    }

    if ( updateData.allowCommunityTranslation === true && (content.ownershipTier !== OwnershipTier.Licensed || nextPricingType !== ContentPricingType.Free)) {
      throw new BadRequestException(
        'Chỉ Publisher mới được bật dịch cộng đồng và chỉ khi Content miễn phí',
      );
    }
    if (updateData.allowCommunityTranslation === true) {
      const publisher = await this.prisma.publisher.findUnique({
        where: { userId: uploaderId },
        select: { verificationStatus: true },
      });
      if (!publisher || publisher.verificationStatus !== 'Approved') {
        throw new ForbiddenException(
          'Chỉ Publisher đã xác minh mới được bật dịch cộng đồng',
        );
      }
    }
  }

  // Kiểm tra và trả về lý do từ chối Content sau khi loại bỏ khoảng trắng thừa.
  validateRejectContentReason(rejectionReason?: string) {
    const normalizedRejectionReason = rejectionReason?.trim();
    if (!normalizedRejectionReason) {
      throw new BadRequestException('Vui lòng nhập lý do từ chối Content');
    }
    return normalizedRejectionReason;
  }

  // Đảm bảo người gửi có quyền và Content đang ở trạng thái bị từ chối trước khi gửi lại.
  validateResubmitContent(
    content: {
      uploaderId: string;
      publicationStatus: string;
    },
    uploaderId: string,
  ) {
    if (content.uploaderId !== uploaderId) {
      throw new ForbiddenException('Không có quyền resubmit Content này');
    }
    if (content.publicationStatus !== PublicationStatus.Rejected) {
      throw new ForbiddenException('Chỉ resubmit được Content đang ở trạng thái Rejected');
    }
  }

  // Đảm bảo trạng thái hiện tại đúng như mong đợi trước khi chuyển sang trạng thái mới.
  validateContentStatusTransition(
    currentPublicationStatus: string,
    expectedPublicationStatus: PublicationStatus,
    nextPublicationStatus: PublicationStatus,
  ) {
    if (currentPublicationStatus !== expectedPublicationStatus) {
      throw new ForbiddenException(
        `Content phải ở trạng thái ${expectedPublicationStatus} mới chuyển sang ${nextPublicationStatus} được (hiện tại: ${currentPublicationStatus})`,
      );
    }
  }
}
