import {Module} from '@nestjs/common';
import { BookmarkService } from './bookmark.service';
import { BookmarkController } from './bookmark.controller';
import { AuthModule } from '../user/auth/auth.module';

@Module({
    imports: [AuthModule],
    controllers: [BookmarkController],
    providers: [BookmarkService],
})
export class BookmarkModule{}