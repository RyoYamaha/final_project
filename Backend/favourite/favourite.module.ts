import {Module} from '@nestjs/common';
import {FavouriteController} from './favourite.controller';
import {FavouriteService} from './favourite.service';
import { AuthModule } from '../user/auth/auth.module';

@Module({
    imports: [AuthModule],
    controllers: [FavouriteController],
    providers: [FavouriteService]
})
export class FavoriteModule{}

