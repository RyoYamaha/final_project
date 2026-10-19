import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterPublisherExternalDto } from './dto/register-publisher-external.dto';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({ where: { OR: [{ username: dto.username },
       { email: dto.email }] },});
    if (existing) {
      throw new ConflictException('Username or email has already existed');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10); //mã hóa mật khẩu cấp độ 10 

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
        role: dto.role || 'Reader', // lấy role từ DTO hoặc mặc định là Reader
      },
    });

    return this.issueTokens(user.id, user.role, user.username); //phát token lại cho người dùng có id như này và role này 
  }

  // Đăng ký NXB trực tiếp từ bên ngoài (One-step transaction)
  async registerPublisherExternal(dto: RegisterPublisherExternalDto, file: Express.Multer.File) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ username: dto.username }, { email: dto.email }] },
    });
    if (existing) {
      throw new ConflictException('Username or email has already existed');
    }

    const verificationDocumentUrl = await this.cloudinary.uploadFile(
      file.buffer,
      'publisher-verifications',
      file.mimetype,
    );
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Sử dụng transaction để đảm bảo tạo User và Publisher cùng lúc (hoặc cả 2 cùng fail)
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: dto.username,
          email: dto.email,
          passwordHash,
          role: 'Publisher', // Ép cứng role là Publisher
        },
      });

      await tx.publisher.create({
        data: {
          userId: newUser.id,
          organizationName: dto.organizationName,
          verificationDocumentUrl,
          verificationStatus: 'Pending',
        },
      });

      return newUser;
    });

    // Sau khi đăng ký xong, cũng cấp luôn token để họ tự đăng nhập và thấy trang Pending
    return this.issueTokens(user.id, user.role, user.username);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({where: { OR: [{ username: dto.usernameOrEmail }, { email: dto.usernameOrEmail }],},});

    if (!user){ 
      throw new UnauthorizedException('wrong email or password');
    }
    if (user.isLocked){ 
      throw new UnauthorizedException('this account have been locked by admin');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash); //mã hóa lại mật khẩu và so sánh với mật khẩu 

    if (!passwordValid) throw new UnauthorizedException('wrong password');

    return this.issueTokens(user.id, user.role, user.username); //phát lại token và role cho người dùng
  }
// lấy lại token mới khi access token hết hạn 

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken); // hash là mã hóa (băm) token này 

    const stored = await this.prisma.refreshToken.findUnique({where: { tokenHash },}); //tìm xem token có tồn tại không

    if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is expired');
    }

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || user.isLocked) {
      throw new UnauthorizedException('this account is not valid');
    }

    // Thu hồi refresh token cũ, phát token mới (rotation)  tránh 1 refresh token dùng lại nhiều lần
    await this.prisma.refreshToken.update({
      where: { tokenHash },
      data: { isRevoked: true },
    }); //hủy bỏ cái token cũ 

    return this.issueTokens(user.id, user.role, user.username); //trả lại người dùng token mới và refresh token mới cùng với role của người dùng 

  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken); //mã hóa refreshtoken 
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { isRevoked: true },
    }); //hủy bỏ cái token cũ 
    return { message: 'log out successfully' };
  }
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, role: true, isLocked: true },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  private async issueTokens(userId: string, role: string, username?: string) {
    const payload = { sub: userId, role, ...(username ? { username } : {}) }; 

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: (process.env.JWT_ACCESS_EXPIRES ?? '15m') as unknown as JwtSignOptions['expiresIn'],
    }); //tạo access token mới tồn tại trong 15p 

    const refreshToken = crypto.randomBytes(64).toString('hex'); //tạo 1 chuỗi byte ngẫu nhiên 64 byte
    //chuyển sang dạng hexstring  rồi lưu vào biến refresh token
    const tokenHash = this.hashToken(refreshToken); //mã hóa refresh token để đảm bảo an toàn 


    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // khớp JWT_REFRESH_EXPIRES=7d

    await this.prisma.refreshToken.create({data: { userId, tokenHash, expiresAt },}); //tạo bản ghi refresh token trong cơ sở dữ liệu

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    // Không lưu refresh token thô trong DB — chỉ lưu hash, giống nguyên tắc lưu password
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}