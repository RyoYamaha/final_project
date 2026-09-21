import {Module} from '@nestjs/common';
import { ReadingProgressController } from 'ReadingProgress/reading-progress.controller';
import { ReadingProgressService } from 'ReadingProgress/reading-progress.service';
import { AuthModule } from '../user/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ReadingProgressController],
  providers: [ReadingProgressService],
})
export class ReadingProgressModule {}