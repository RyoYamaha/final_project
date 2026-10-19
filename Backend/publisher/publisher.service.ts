import { Injectable, BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContentService } from '../core/content/content.service';
import { RegisterPublisherDto } from './dto/register-publisher.dto';
import { CreatePublisherContentDto } from './dto/create-publisher-content.dto';
import { OwnershipTier } from '../common/constants/content.enum';
import { NotificationService } from '../notification/notification.service'
import { NotificationType } from '../common/constants/notification.enum';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { UpdateContentDto } from '../core/content/dto/update-content.dto';

@Injectable()
export class PublisherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contentService: ContentService,
    private readonly notificationService: NotificationService,
    private readonly cloudinary: CloudinaryService,
  ) { }

  //Đăng ký publisher 

  async register(userId: string, dto: RegisterPublisherDto, file: Express.Multer.File) {
    const existing = await this.prisma.publisher.findUnique({ where: { userId } });
    if (existing && existing.verificationStatus !== 'Rejected') {
      throw new ConflictException('Tài khoản này đã đăng ký Publisher rồi');
    }

    if (!file || !this.isValidVerificationFile(file)) {
      throw new BadRequestException('Vui lòng gửi ảnh JPEG, PNG, WebP hoặc tệp PDF hợp lệ');
    }

    const verificationDocumentUrl = await this.cloudinary.uploadFile(
      file.buffer,
      'publisher-verifications',
      file.mimetype,
    );
    if (existing) {
      return this.prisma.publisher.update({
        where: { userId },
        data: {
          organizationName: dto.organizationName,
          verificationDocumentUrl,
          verificationStatus: 'Pending',
        },
      });
    }

    return this.prisma.publisher.create({
      data: {
        userId,
        organizationName: dto.organizationName,
        verificationDocumentUrl,
        verificationStatus: 'Pending',
      },
    });
  }

  private isValidVerificationFile(file: Express.Multer.File) {
    const signatures: Record<string, (buffer: Buffer) => boolean> = {
      'image/jpeg': (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
      'image/png': (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
      'image/webp': (buffer) =>
        buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP',
      'application/pdf': (buffer) => buffer.toString('ascii', 0, 5) === '%PDF-',
    };
    const validateSignature = signatures[file.mimetype];
    return Boolean(validateSignature && validateSignature(file.buffer));
  }

  //tìm profile publisher 

  async getMyPublisherProfile(userId: string) {
    const publisher = await this.prisma.publisher.findUnique({ where: { userId } });
    if (!publisher) throw new NotFoundException('Chưa đăng ký Publisher');
    return publisher;
  }

  //tạo content cho publisher 

  async createContent(userId: string, dto: CreatePublisherContentDto) {
    const publisher = await this.getVerifiedPublisher(userId);
    return this.contentService.createContent( // đẩy content của id publisher đó 
      dto,
      userId,
      OwnershipTier.Licensed,
      publisher.id,
    );
  }

  //dựa vào userid của publisher, lấu ra những content tương ứng với publisher đó 
  async getMyContents(userId: string) {
    const publisher = await this.getVerifiedPublisher(userId);
    return this.prisma.content.findMany({ //tìm content với điều kiện gắn với id của publisher và sắp xếp theo thứ tự giảm dần 
      where: { publisherId: publisher.id },
      include: {
        genres: { include: { genre: true } },
        tags: { include: { tag: true } },
        _count: { select: { chapters: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Xem chi tiết truyện của publisher (kèm tất cả các chương kể cả PendingReview)
  async getPublisherContentDetail(userId: string, contentId: string) {
    const publisher = await this.getVerifiedPublisher(userId);
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        mangaDetail: true,
        novelDetail: true,
        genres: { include: { genre: true } },
        tags: { include: { tag: true } },
        chapters: { orderBy: { number: 'asc' } },
        publisher: true,
      },
    });

    if (!content) throw new NotFoundException('Không tìm thấy Content');
    if (content.publisherId !== publisher.id) {
      throw new ForbiddenException('Không có quyền xem chi tiết truyện này');
    }

    return content;
  }

  // Chỉnh sửa truyện của Publisher
  async updateContent(userId: string, contentId: string, dto: UpdateContentDto) {
    // Tạm thời xác thực quyền sở hữu
    await this.getPublisherContentDetail(userId, contentId);
    return this.contentService.updateContent(contentId, userId, dto);
  }

  // Upload ảnh bìa cho truyện
  async uploadCoverImage(file: Express.Multer.File) {
    const result = await this.cloudinary.uploadImage(file.buffer, 'covers');
    return { url: result };
  }

  //gửi lại content cho bên admin khi bị từ chối 

  async resubmitContent(userId: string, contentId: string) {
    return this.contentService.resubmit(contentId, userId);
  }

  //xác nhận publisher có tồn tại không 
  private async getVerifiedPublisher(userId: string) {
    const publisher = await this.prisma.publisher.findUnique({ where: { userId } });
    //tìm publisher xem có không
    if (!publisher) throw new NotFoundException('Chưa đăng ký Publisher');
    if (publisher.verificationStatus !== 'Approved') {
      throw new ForbiddenException('Publisher chưa được Admin xác minh, chưa thể đăng Content');
    }
    return publisher; //trả lại publisher để các function có thể sử dụng 
  }

  //hàm (method) dùng để admin update vertification của publisher 
  async approveVerification(publisherId: string) {
    const publisher = await this.prisma.publisher.update({
      where: { id: publisherId },
      data: { verificationStatus: 'Approved' },
    });
    await this.createNotificationSafely(
      publisher.userId,
      NotificationType.PublisherVerified,
      'Hồ sơ Publisher của bạn đã được xác minh.',
    );
    return publisher;
  }
  // tương tự 
  async rejectVerification(publisherId: string) {
    const publisher = await this.prisma.publisher.update({
      where: { id: publisherId },
      data: { verificationStatus: 'Rejected' },
    });
    await this.createNotificationSafely(
      publisher.userId,
      NotificationType.PublisherRejected,
      'Hồ sơ Publisher của bạn đã bị từ chối.',
    );
    return publisher;
  }
  private async createNotificationSafely(userId: string, type: NotificationType, message: string) {
    try {
      await this.notificationService.create(userId, type, message);
    } catch (error) {
      console.error('Failed to create notification', error);
    }
  }
}