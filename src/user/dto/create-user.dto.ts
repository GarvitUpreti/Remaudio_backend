import { IsNumber, IsArray, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {

  @IsOptional()
  @IsString()
  name?: string; // Name is optional and must be a string

  @IsOptional()
  @IsString()
  password?: string; // Password is optional and must be a string; 

  @IsString()
  @IsOptional()
  email?: string; // Email is optional and must be a string
}
