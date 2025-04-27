import { IsNumber, IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {

  @IsOptional()
  @IsString()
  name?: string; // Name is optional and must be a string

  @IsOptional()
  @IsString()
  password?: string; // Password is optional and must be a string; 

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })                             
  songToAdd?: number[]; // Array of song IDs to be added

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })                                 
  songToRemove?: number[]; // Array of song IDs to be remove   

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })                             
  playlistToAdd?: number[]; // Array of song IDs to be added

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })                                 
  playlistToRemove?: number[]; // Array of song IDs to be remove   


}
