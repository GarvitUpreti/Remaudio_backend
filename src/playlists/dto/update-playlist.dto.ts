import { IsNumber, IsArray, IsOptional, IsString } from 'class-validator';

export class UpdatePlaylistDto {

  @IsOptional()
  @IsString()
  name?: string; // Name is optional and must be a string

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })                                // you have to pass a empty array if you dont want to add any song
  songIdsToAdd?: number[]; // Array of song IDs to be added

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })                                 // you have to pass a empty array if you dont want to remove any song
  songIdsToRemove?: number[]; // Array of song IDs to be remove      
 
}
