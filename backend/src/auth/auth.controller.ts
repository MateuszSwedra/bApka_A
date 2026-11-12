import { Controller, Post, Body, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';

@ApiTags('auth')
@UseGuards(AuthRateLimitGuard)
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('google')
  @ApiOperation({ summary: 'Login or register with Google id_token' })
  async google(@Body() body: GoogleLoginDto) {
    return this.authService.loginWithGoogle(body.idToken);
  }
}
