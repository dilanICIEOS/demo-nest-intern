import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { RegisterDto } from './dtos/register.dto';
import { UsersService } from 'src/users/users.service';
import { LoginDto } from './dtos/login.dto';
import { Request } from 'express';
import { DevicesService } from 'src/devices/devices.service';
import { SessionsService } from 'src/sessions/sessions.service';
import { OtpService } from 'src/otp/otp.service';
import { JwtService } from '@nestjs/jwt';
import { Session } from '../generated/prisma';

@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
    private deviceService: DevicesService,
    private sessionsService: SessionsService,
    private otpService: OtpService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, password, confirmPassword } = registerDto;

    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const existingUser = await this.userService.getUserByEmail(email);

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await this.userService.createUser(email, hashedPassword);

    return {
      message: 'User registered successfully',
      userId: newUser.id,
    };
  }

  async login(logindto: LoginDto, req: Request) {
    const { email, password, otp, isTrust, deviceId } = logindto;

    const user = await this.userService.getUserByEmail(email);

    if (!user) {
      throw new BadRequestException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.hashedPassword);

    if (!isMatch) {
      throw new BadRequestException('Invalid email or password');
    }

    let device: { id: string; createdAt: Date; isTrusted: boolean; userId: string; deviceFingerprint: string; deviceName: string; userAgent: string; ipAddress: string; lastUsedAt: Date; } | null = null;

    if(deviceId) {
      device = await this.deviceService.getDeviceById(deviceId as string);
    }

    if (device && (device.isTrusted || !user.isEnabled2FA)) {
      const session: Session = await this.sessionsService.createSession(
        user.id,
        device.id,
      );
      const { accessToken, refreshToken } =
        await this.sessionsService.generateTokens(
          user.id,
          user.email,
          device.id,
          session.id,
        );
      await this.sessionsService.addRefreshTokenHashToSession(
        session.id,
        refreshToken,
      );
      device = await this.deviceService.addOrUpdateDevice(
        req,
        user.id,
        isTrust || false,
      );
      return {
        message: 'Login successful',
        userId: user.id,
        deviceId: device.id,
        refreshToken,
        accessToken,
      };
    } else {
      if (!device) {
        device = await this.deviceService.addOrUpdateDevice(
          req,
          user.id,
          isTrust || false,
        );
      }
      if (!otp && user.isEnabled2FA) {
        await this.otpService.generateAndSendOtp(
          user.id,
          user.email,
          device.id,
        );
        return {
          message: 'OTP required for 2FA-enabled account',
          userId: user.id,
          deviceId: device.id,
          refreshToken: null,
          expiresAt: null,
        };
      }
      if (otp && user.isEnabled2FA) {
        const isOtpValid = await this.otpService.verifyOtp(
          user.id,
          device.id,
          otp.toString(),
        );
        if (!isOtpValid) {
          throw new BadRequestException('Invalid OTP');
        }
      }

      await this.otpService.invalidateOtp(user.id, device.id);

      const session: Session = await this.sessionsService.createSession(
        user.id,
        device.id,
      );
      const { accessToken, refreshToken } =
        await this.sessionsService.generateTokens(
          user.id,
          user.email,
          device.id,
          session.id,
        );
      await this.sessionsService.addRefreshTokenHashToSession(
        session.id,
        refreshToken,
      );
      device = await this.deviceService.addOrUpdateDevice(
        req,
        user.id,
        isTrust || false,
      );
      return {
        message: 'Login successful',
        userId: user.id,
        deviceId: device.id,
        refreshToken,
        accessToken,
      };
    }
  }

  async checkLoginStatus(
    userId: string,
    deviceId: string,
    sessionId: string,
    token: string,
  ) {
    const user = await this.userService.getUserById(userId);
    if (!user) {
      return {
        message: 'User not found',
        isLoggedIn: false,
        isTrusted: false,
      };
    }

    const device = await this.deviceService.getDeviceById(deviceId);
    if (!device) {
      return {
        message: 'Device not found',
        isLoggedIn: false,
        isTrusted: false,
      };
    }
    const isSessionValid = await this.sessionsService.validateSession(
      sessionId,
      userId,
      deviceId,
      token,
    );
    if (!isSessionValid) {
      return {
        message: 'Invalid session',
        isLoggedIn: false,
        isTrusted: false,
      };
    }

    return {
      message: 'User is logged in',
      isLoggedIn: true,
      isTrusted: device.isTrusted,
    };
  }

  async logout() {
    // Implement logout logic here
  }

  async verifyEmail(token: string) {
    // Implement email verification logic here
  }

  async requestPasswordReset(email: string) {
    // Implement password reset request logic here
  }
}
