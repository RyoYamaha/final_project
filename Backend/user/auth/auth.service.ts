import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ username: dto.username }, { email: dto.email }] },
    });
    if (existing) {
      throw new ConflictException('Username hoặc email đã tồn tại');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
        role: 'Reader', // mặc định luôn là Reader, không cho tự chọn role lúc đăng ký
      },
    });

    return this.issueTokens(user.id, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: dto.usernameOrEmail }, { email: dto.usernameOrEmail }],
      },
    });

    if (!user) throw new UnauthorizedException('Sai tài khoản hoặc mật khẩu');
    if (user.isLocked) throw new UnauthorizedException('Tài khoản đã bị khoá');

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) throw new UnauthorizedException('Sai tài khoản hoặc mật khẩu');

    return this.issueTokens(user.id, user.role);
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || user.isLocked) {
      throw new UnauthorizedException('Tài khoản không hợp lệ');
    }

    // Thu hồi refresh token cũ, phát token mới (rotation) — tránh 1 refresh token dùng lại nhiều lần
    await this.prisma.refreshToken.update({
      where: { tokenHash },
      data: { isRevoked: true },
    });

    return this.issueTokens(user.id, user.role);
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { isRevoked: true },
    });
    return { message: 'Đã đăng xuất' };
  }

  private async issueTokens(userId: string, role: string) {
    const payload = { sub: userId, role };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    });

    const refreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(refreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // khớp JWT_REFRESH_EXPIRES=7d

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    // Không lưu refresh token thô trong DB — chỉ lưu hash, giống nguyên tắc lưu password
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}