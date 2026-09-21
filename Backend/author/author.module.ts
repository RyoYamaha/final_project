import { Module } from '@nestjs/common';
import { AuthorService } from './author.service';
import { AuthorController } from './author.controller';
import { ContentModule } from '../core/content/content.module';
import { AuthModule } from '../user/auth/auth.module';

@Module({
  imports: [ContentModule, AuthModule],
  controllers: [AuthorController],
  providers: [AuthorService],
  exports: [AuthorService],
})
export class AuthorModule {}