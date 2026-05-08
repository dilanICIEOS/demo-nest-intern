import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dtos/register.dto';
import { LoggingAndResponseInterceptor } from 'src/interceptors/loggingAndResponse.interceptor';
import type { Request } from 'express';
import { LoginDto } from './dtos/login.dto';

@UseInterceptors(LoggingAndResponseInterceptor)
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req: Request): Promise<any> {
    const response = await this.authService.login(loginDto, req);
    return response;
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<any> {
    const response = await this.authService.register(registerDto);
    return response;
  }

  @Get('verify-email')
  async verifyEmail(@Req() req: Request): Promise<any> {
    const token = req.query.token as string;
    const userId = req.query.userId as string;
    const response = await this.authService.verifyEmail(userId, token);
    return response;
  }

  @Post('change-2fa')
  async change2FA(
    @Body() body: { userId: string; enable: boolean },
  ): Promise<any> {
    const response = await this.authService.enableOrDisable2FA(
      body.userId,
      body.enable,
    );
    return response;
  }

  @Get('logout')
  async logout(@Req() req: Request): Promise<any> {
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
      throw new Error('Access token is required for logout');
    }
    const response = await this.authService.logout(accessToken);
    return response;
  }

  @Get('check-login-status')
  async checkLoginStatus(@Req() req: Request): Promise<any> {
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    if (!accessToken) {
      return { loggedIn: false };
    }
    const isValid = await this.authService.checkLoginStatus(accessToken);
    return { loggedIn: isValid };
  }
}
