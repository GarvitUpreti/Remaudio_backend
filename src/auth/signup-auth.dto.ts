import { IsEmail, IsOptional, IsString } from "class-validator";

export class signupAuthDto{

    @IsEmail()
    email : string

    @IsOptional()
    @IsString()
    name?: string; // Name is optional and must be a string

    @IsOptional()
    @IsString()
    password?: string; // Password is optional and must be a string; 
    
    @IsString()
    @IsOptional()
    profilePic?: string;
}