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

    // ✅ Helper method to create access tokens with proper expiration
    private createAccessToken(user: any): string {
        return this.jwtService.sign(
            { sub: user.id, email: user.email },
            {
                expiresIn: this.configService.get<string>('JWT_EXPIRATION') || '1h',
            }
        );
    }

    // ✅ Helper method to create refresh tokens with proper expiration
    private createRefreshToken(user: any): string {
        return this.jwtService.sign(
            { sub: user.id, email: user.email },
            {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
                expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '15d',
            }
        );
    }

    async signIn(email : string , Password : string): Promise<{ access_token: string , refresh_token: string }>{
        const user = await this.userService.findByEmail(email);
        if (!user) {
          throw new UnauthorizedException('User does not exist');
        }
        
        const isPasswordValid = await bcrypt.compare(Password, user.password);
        if (!isPasswordValid) {
            console.log("Password not matched");
            throw new UnauthorizedException('Invalid credentials');
        }

        // ✅ Use helper methods for consistent token creation
        const access_token = this.createAccessToken(user);
        const refresh_token = this.createRefreshToken(user);

        // Store hashed refresh token in database
        const hashedRefreshToken = await bcrypt.hash(refresh_token, 10);
        await this.userService.updateRefreshToken(user.id, hashedRefreshToken);

        return {
            access_token,
            refresh_token,
        };
    }

    async signUp(dto: signupAuthDto): Promise<{ access_token: string , refresh_token: string }>{
        const existing = await this.userService.findByEmail(dto.email);
        if (existing) throw new BadRequestException('User already exists');

        const user = await this.userService.create({
            email: dto.email,
            name: dto.name,
            password: dto.password,
            profilePic : dto.profilePic
        });

        // ✅ Use helper methods for consistent token creation
        const access_token = this.createAccessToken(user);
        const refresh_token = this.createRefreshToken(user);

        // Store hashed refresh token in database
        const hashedRefreshToken = await bcrypt.hash(refresh_token, 10);
        await this.userService.updateRefreshToken(user.id, hashedRefreshToken);

        return { access_token, refresh_token };
    }

    // ✅ Fixed refresh method with token rotation
    async refresh(token: string): Promise<{ access_token: string, refresh_token: string }> {
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

            // ✅ Create new tokens (token rotation for security)
            const access_token = this.createAccessToken(user);
            const refresh_token = this.createRefreshToken(user);

            // ✅ Update refresh token in database
            const hashedRefreshToken = await bcrypt.hash(refresh_token, 10);
            await this.userService.updateRefreshToken(user.id, hashedRefreshToken);
      
            return { 
                access_token,
                refresh_token // ✅ Return new refresh token
            };
        } catch (err) {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    async handleGoogle(dto: GoogleAuthDto): Promise<{ access_token: string, refresh_token: string }> {
        try {
            const ticket = await this.oauthClient.verifyIdToken({
                idToken: dto.token,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();

            const user = await this.userService.findByEmail(payload.email);
            if (!user) {
                console.log(`[Google Signin] New user detected: ${payload.email}`);
                throw new UnauthorizedException('User does not exist');
            }

            // ✅ Use helper methods for consistent token creation
            const access_token = this.createAccessToken(user);
            const refresh_token = this.createRefreshToken(user);

            // Store hashed refresh token in database
            const hashedRefreshToken = await bcrypt.hash(refresh_token, 10);
            await this.userService.updateRefreshToken(user.id, hashedRefreshToken);

            return { access_token, refresh_token };
            
        } catch(err) {
            console.error("Google Auth Error:", err);
            throw new UnauthorizedException("Invalid Google token");
        }
    }

    async completeGoogleSignup(dto: GoogleCompleteSignupDto): Promise<{ access_token: string, refresh_token: string }> {
        try {
            const ticket = await this.oauthClient.verifyIdToken({
                idToken: dto.token,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();
            
            const existing = await this.userService.findByEmail(payload.email);
            if (existing) throw new BadRequestException('User already exists');

            console.log('Creating user:', {
                email: payload.email,
                picture: payload.picture,
                googleId: payload.sub,
                name: dto.name
            });
            
            const user = await this.userService.create({
                email: payload.email,
                googleId: payload.sub,
                name: dto.name,
                password: dto.password,
                profilePic : payload.picture
            });

            // ✅ Use helper methods for consistent token creation
            const access_token = this.createAccessToken(user);
            const refresh_token = this.createRefreshToken(user);

            // Store hashed refresh token in database
            const hashedRefreshToken = await bcrypt.hash(refresh_token, 10);
            await this.userService.updateRefreshToken(user.id, hashedRefreshToken);

            return { access_token, refresh_token };
            
        } catch(err) {
            console.error("Google Signup Error:", err);
            throw new UnauthorizedException("Invalid Google token");
        }
    } 
}