import {IsUUID, IsInt, Min, Max} from 'class-validator';
export class CreateRatingDto{
    @IsUUID()
    contentId: string;
    @IsInt()
    @Min(1)
    @Max(10)
    score: number;
}