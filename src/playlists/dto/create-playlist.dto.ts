import { IsOptional, IsString } from "class-validator";

export class CreatePlaylistDto {
      @IsString()
      name: string; // Name is optional and must be a string
}
