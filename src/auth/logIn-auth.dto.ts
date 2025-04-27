import { IsEmail, IsString } from "class-validator";

export class loginAuthDto{

    @IsEmail()
    email : string

    @IsString()
    password : string 
}