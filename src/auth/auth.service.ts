import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { GoogleCompleteSignupDto } from './dto/google-complete.signup.dto';
import { OAuth2Client } from 'google-auth-library';
import { signupAuthDto } from './signup-auth.dto';



@Injectable()
export class AuthService {
    constructor (
        private userService : UserService,
        private jwtService: JwtService,
        private configService: ConfigService,
        private oauthClient: OAuth2Client

    ){}

    async signIn(email : string , Password : string):Promise<{ access_token: string , refresh_token: string }>{

        const user = await this.userService.findByEmail(email);
        if (!user) {
          throw new UnauthorizedException('User does not exist');
        }
        
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

    async signUp(dto:signupAuthDto):Promise<{ accessToken: string , refreshToken: string }>{

      const existing = await this.userService.findByEmail(dto.email);
    if (existing) throw new BadRequestException('User already exists');

    // const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.userService.create({
      email: dto.email,
      name: dto.name,
      password: dto.password,
      profilePic : dto.profilePic
    });

    const refreshToken = this.jwtService.sign(
          { sub: user.id, email: user.email },
          {
            secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d',
          }
          );
          const accessToken = this.jwtService.sign({ sub: user.id });
          return { accessToken, refreshToken};

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

    async handleGoogle(dto: GoogleAuthDto) {

      try {
        const ticket = await this.oauthClient.verifyIdToken({
            idToken: dto.token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();

        const user = await this.userService.findByEmail(payload.email);

        

        if (user) {

          const refreshToken = this.jwtService.sign(
          { sub: user.id, email: user.email },
          {
            secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d',
          }
          );
          const accessToken = this.jwtService.sign({ sub: user.id });
          return { accessToken, refreshToken};
        }

        // user not found → return partial response
        console.log(`[Google Signin] New user detected: ${payload.email}`);
        throw new UnauthorizedException('User does not exist');
        
      }catch(err) {
        console.error("Google Auth Error:", err);
        throw new UnauthorizedException("Invalid Google token");
      }
    }

  async completeGoogleSignup(dto: GoogleCompleteSignupDto) {
    const ticket = await this.oauthClient.verifyIdToken({
            idToken: dto.token,
            audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const existing = await this.userService.findByEmail(payload.email);
    if (existing) throw new BadRequestException('User already exists');

    
    console.log(payload.email)
    console.log(payload.picture)
    console.log(payload.sub)
    console.log(dto.name)
    console.log(dto.password)
    
    
    const user = await this.userService.create({
      email: payload.email,
      googleId: payload.sub,
      name: dto.name,
      password: dto.password,
      profilePic : payload.picture
    });

    const refreshToken = this.jwtService.sign(
          { sub: user.id, email: user.email },
          {
            secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d',
          }
          );
          const accessToken = this.jwtService.sign({ sub: user.id });
          return { accessToken, refreshToken};
  } 
}
