import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards ,Request} from '@nestjs/common';
import { AuthService } from './auth.service';
import { loginAuthDto } from './logIn-auth.dto';
import { AuthGuard } from './auth.guard';
import { Public } from './public.decorator';

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
    return {
        access_token: result.access_token,
        refresh_token: result.refresh_token
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
}
