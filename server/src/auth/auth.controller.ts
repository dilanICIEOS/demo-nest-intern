import { Body, Controller, Post, Req, UseInterceptors } from '@nestjs/common';
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
}
