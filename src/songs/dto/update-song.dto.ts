import { IsOptional, IsString } from 'class-validator';

export class UpdateSongDto {
  
  @IsOptional()
  @IsString()
  name?: string; // Name is optional and must be a string

  @IsOptional()
  @IsString()
  artist?: string; // Artist is optional and must be a string
}
