import { IsEmail, IsString, MinLength } from 'class-validator';

export class GoogleCompleteSignupDto {

  @IsString()
  token: string;

  @IsString()
  name: string;

  @IsString()
  @MinLength(6)
  password: string;
}
