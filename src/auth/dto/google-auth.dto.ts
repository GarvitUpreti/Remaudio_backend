import { IsString, IsOptional, IsIn } from 'class-validator';

export class GoogleAuthDto {
  @IsString()
  token: string;
}