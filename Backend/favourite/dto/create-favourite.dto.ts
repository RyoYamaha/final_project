import { isUUID, IsUUID } from "class-validator";

export class CreateFavouriteDto{
    @IsUUID()
    contentId: string;
}