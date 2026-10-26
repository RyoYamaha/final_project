import { Body, Controller, Post, Get, HttpCode, HttpStatus, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Put } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RegisterPublisherExternalDto } from './dto/register-publisher-external.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('register-publisher')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async registerPublisher(
    @Body() dto: RegisterPublisherExternalDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file || !this.isValidVerificationFile(file)) {
      throw new BadRequestException('Vui lòng gửi ảnh JPEG, PNG, WebP hoặc tệp PDF hợp lệ');
    }
    return this.authService.registerPublisherExternal(dto, file);
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

  @Post('login')
  @HttpCode(HttpStatus.OK) // mặc định POST trả 201, đổi lại thành 200 cho đúng ngữ nghĩa login
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Get('genre-preferences')
  @UseGuards(JwtAuthGuard)
  async getGenrePreferences(@CurrentUser('id') userId: string) {
    return this.authService.getGenrePreferences(userId);
  }

  @Put('genre-preferences')
  @UseGuards(JwtAuthGuard)
  async saveGenrePreferences(
    @CurrentUser('id') userId: string,
    @Body('genreIds') genreIds: string[],
  ) {
    if (!Array.isArray(genreIds) || genreIds.some((genreId) => typeof genreId !== 'string')) {
      throw new BadRequestException('genreIds phải là danh sách ID thể loại');
    }
    return this.authService.saveGenrePreferences(userId, genreIds);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body('refreshToken') refreshToken: string) {
    return this.authService.logout(refreshToken);
  }
}