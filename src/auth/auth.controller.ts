import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards ,Request} from '@nestjs/common';
import { AuthService } from './auth.service';
import { loginAuthDto } from './logIn-auth.dto';
import { AuthGuard } from './auth.guard';
import { Public } from './public.decorator';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { GoogleCompleteSignupDto } from './dto/google-complete.signup.dto';
import { signupAuthDto } from './signup-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async signIn(@Body() loginauthdto: loginAuthDto) {
    const { email, password } = loginauthdto;

    // Call the AuthService to handle login
    const result = await this.authService.signIn(email, password);

    // Return the access token and refresh token
    console.log('Access token generated:', !!result.access_token);
    console.log('Refresh token generated:', !!result.refresh_token);
    
    return {
        access_token: result.access_token,
        refresh_token: result.refresh_token
    };
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('signup')
  async signup(@Body() signupauthdto: signupAuthDto) {
    // Call the AuthService to handle signup
    const result = await this.authService.signUp(signupauthdto);

    // ✅ Fixed field names to match frontend expectations
    return {
        access_token: result.access_token,  // ✅ Changed from accessToken
        refresh_token: result.refresh_token // ✅ Changed from refreshToken
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body('refresh_token') token: string) {
    return this.authService.refresh(token);
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @Public()
  @Post('google/login')
  async handleGoogle(@Body() dto: GoogleAuthDto) {
    const result = await this.authService.handleGoogle(dto);
    
    // ✅ Fixed field names to match frontend expectations
    return {
        access_token: result.access_token,  // ✅ Changed from accessToken
        refresh_token: result.refresh_token // ✅ Changed from refreshToken
    };
  }

  @Public()
  @Post('google/signup')
  async completeSignup(@Body() dto: GoogleCompleteSignupDto) {
    const result = await this.authService.completeGoogleSignup(dto);
    
    // ✅ Fixed field names to match frontend expectations
    return {
        access_token: result.access_token,  // ✅ Changed from accessToken
        refresh_token: result.refresh_token // ✅ Changed from refreshToken
    };
  }
}