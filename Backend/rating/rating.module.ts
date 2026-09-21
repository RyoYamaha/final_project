import {Module} from '@nestjs/common';
import { RatingController } from './rating.controller';
import { RatingService } from './rating.service';
import { AuthModule } from '../user/auth/auth.module';
@Module({
    imports: [AuthModule],
    controllers: [RatingController],
    providers: [RatingService]
})
export class RatingModule{}