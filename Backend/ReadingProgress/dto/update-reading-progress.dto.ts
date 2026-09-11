import {IsUUID, IsOptional, IsInt, Min} from 'class-validator'

export class UpdateReadingProgressDto{
    @IsUUID()
    chapterId: string 

    @IsOptional()
    @IsInt()
    @Min(1)
    lastPageNumber?: number;
}