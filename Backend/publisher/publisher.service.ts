import { Injectable, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ContentService } from '../core/content/content.service';
import { RegisterPublisherDto } from './dto/register-publisher.dto';
import { CreatePublisherContentDto } from './dto/create-publisher-content.dto';
import { OwnershipTier } from '../common/constants/content.enum';

@Injectable()
export class PublisherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contentService: ContentService,
  ) {}

//Đăng ký publisher 

  async register(userId: string, dto: RegisterPublisherDto) {
    const existing = await this.prisma.publisher.findUnique({ where: { userId } });
    if (existing) {
      throw new ConflictException('Tài khoản này đã đăng ký Publisher rồi');
    }
    return this.prisma.publisher.create({
      data: { userId, organizationName: dto.organizationName, verificationStatus: 'Pending' },
    });
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
    return this.contentService.createContent({ // đẩy content của id publisher đó 
      dto,
      uploaderId: userId,
      ownershipTier: OwnershipTier.Licensed,
      publisherId: publisher.id,
    });
  }

  //dựa vào userid của publisher, lấu ra những content tương ứng với publisher đó 
  async getMyContents(userId: string) {
    const publisher = await this.getVerifiedPublisher(userId);
    return this.prisma.content.findMany({ //tìm content với điều kiện gắn với id của publisher và sắp xếp theo thứ tự giảm dần 
      where: { publisherId: publisher.id },
      orderBy: { createdAt: 'desc' },
    });
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
    return this.prisma.publisher.update({ where: { id: publisherId }, data: { verificationStatus: 'Approved' } });
  } 
 // tương tự 
  async rejectVerification(publisherId: string) {
    return this.prisma.publisher.update({ where: { id: publisherId }, data: { verificationStatus: 'Rejected' } });
  }
}