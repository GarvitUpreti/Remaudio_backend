import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';



@Injectable()
export class AuthService {
    constructor (
        private userService : UserService,
        private jwtService: JwtService,
        private configService: ConfigService 

    ){}

    async signIn(email : string , Password : string):Promise<{ access_token: string , refresh_token: string }>{

        const user = await this.userService.findByEmail(email);
        const isPasswordValid = await bcrypt.compare(Password, user.password);

        if (!isPasswordValid) {
            console.log("not matched");
            throw new UnauthorizedException();
        }

        const payload = { sub: user.id, email: user.email };


        const refresh_token = this.jwtService.sign(payload, {
            secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d',
        });

        const hashedRefreshToken = await bcrypt.hash(refresh_token, 10);
        await this.userService.updateRefreshToken(user.id, hashedRefreshToken);

        return {
        access_token: await this.jwtService.signAsync(payload),
        refresh_token,
        };

        // const {password , ...result} = user;
        // in the above line we are removing password fromt the object body and
        //  assigning the rest of the object to the result object for safety reasons

        // return result;
        
    }

    async refresh(token: string): Promise<{ access_token: string }> {
        try {
          const payload = this.jwtService.verify(token, {
            secret: this.configService.get('JWT_REFRESH_SECRET'),
          });
      
          const user = await this.userService.findById(payload.sub);
          if (!user || !user.refreshToken) {
            throw new UnauthorizedException('Refresh token invalid');
          }
      
          const tokenMatch = await bcrypt.compare(token, user.refreshToken);
          if (!tokenMatch) {
            throw new UnauthorizedException('Refresh token mismatch');
          }
      
          const newAccessToken = await this.jwtService.signAsync(
            { sub: user.id, email: user.email },
          );
      
          return { access_token: newAccessToken };
        } catch (err) {
          throw new UnauthorizedException('Invalid refresh token');
        }
      }
      
    
}
