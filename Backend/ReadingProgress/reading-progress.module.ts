import {Module} from '@nestjs/common';
import { ReadingProgressController } from 'ReadingProgress/reading-progress.controller';
import { ReadingProgressService } from 'ReadingProgress/reading-progress.service';

@Module({
  controllers: [ReadingProgressController],
  providers: [ReadingProgressService],
})
export class ReadingProgressModule {}