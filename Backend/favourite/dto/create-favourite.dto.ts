import { IsUUID } from 'class-validator';

export class CreateFavouriteDto {
    @IsUUID()
    contentId: string;
}