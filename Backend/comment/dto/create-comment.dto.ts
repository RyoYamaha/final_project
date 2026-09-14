import { IsOptional, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateCommentDto {
    @IsUUID()
    contentId: string;

    @IsOptional()
    @IsUUID()
    parentCommentId?: string;

    @MinLength(1)
    @MaxLength(1000)
    body: string;

}