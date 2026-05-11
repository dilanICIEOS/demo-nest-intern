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
import { Session } from '../generated/prisma';
import { EmailsService } from 'src/emails/emails.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
    private deviceService: DevicesService,
    private sessionsService: SessionsService,
    private otpService: OtpService,
    private emailService: EmailsService,
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

    if (!user.isEmailVerified) {
      const verifyToken = Math.random().toString(36).substring(2, 15);
      await this.userService.setUpdatePasswordToken(email, verifyToken);
      await this.emailService.sendEmail({
        to: email,
        subject: 'Your Email Verification Link',
        template: 'emailVerification',
        context: {
          verificationLink: `http://localhost:3000/auth/verify-email?userId=${user.id}&token=${verifyToken}`,
        },
      });
      return {
        message: 'Email not verified. Verification link sent to email.',
        userId: user.id,
        deviceId: null,
        refreshToken: null,
        accessToken: null,
      };
    }

    const isMatch = await bcrypt.compare(password, user.hashedPassword);

    if (!isMatch) {
      throw new BadRequestException('Invalid email or password');
    }

    let device: {
      id: string;
      createdAt: Date;
      isTrusted: boolean;
      userId: string;
      deviceFingerprint: string;
      deviceName: string;
      userAgent: string;
      ipAddress: string;
      lastUsedAt: Date;
    } | null = null;

    if (deviceId) {
      device = await this.deviceService.getDeviceById(deviceId);
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
        isTrust ?? device?.isTrusted ?? false,
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
          false,
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
      console.log('isTrust:', isTrust);
      device = await this.deviceService.addOrUpdateDevice(
        req,
        user.id,
        isTrust ?? device?.isTrusted ?? false,
      );
      return {
        message: 'Login successful',
        userId: user.id,
        deviceId: device,
        refreshToken,
        accessToken,
      };
    }
  }

  async checkLoginStatus(token: string) {
    const payload = this.sessionsService.getAccessTokenPayload(token);
    if (!payload) {
      return {
        message: 'Invalid token',
        isLoggedIn: false,
        isTrusted: false,
      };
    }
    const user = await this.userService.getUserById(payload.sub);
    if (!user) {
      return {
        message: 'User not found',
        isLoggedIn: false,
        isTrusted: false,
      };
    }

    const device = await this.deviceService.getDeviceById(payload.deviceId);
    if (!device) {
      return {
        message: 'Device not found',
        isLoggedIn: false,
        isTrusted: false,
      };
    }
    const isSessionValid = await this.sessionsService.validateSession(
      payload.sessionId,
      payload.sub,
      payload.deviceId,
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

  async logout(accessToken: string) {
    const session =
      await this.sessionsService.deleteSessionByAccessToken(accessToken);
    if (!session) {
      throw new BadRequestException('Invalid session');
    }
    return {
      message: 'Logout successful',
    };
  }

  async verifyEmail(userId: string, token: string) {
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new BadRequestException('Invalid token');
    }
    if (user.updatePasswordToken !== token) {
      throw new BadRequestException('Invalid token');
    }
    await this.userService.markEmailAsVerified(user.email);
    await this.userService.setUpdatePasswordToken(user.email, '');
    return {
      message: 'Email verified successfully',
    };
  }

  async requestPasswordReset(email: string) {
    const user = await this.userService.getUserByEmail(email);
    if (!user) {
      throw new BadRequestException('Email not found');
    }
    const resetPasswordToken = Math.random().toString(36).substring(2, 15);
    await this.userService.setUpdatePasswordToken(email, resetPasswordToken);
    await this.emailService.sendEmail({
      to: email,
      subject: 'Password Reset Request',
      template: 'reset-password',
      context: {
        resetPasswordToken,
      },
    });
    return {
      message: 'Password reset token sent to email',
    };
  }

  async resetPassword(email: string, token: string, newPassword: string) {
    const user = await this.userService.getUserByEmail(email);
    if (!user) {
      throw new BadRequestException('Email not found');
    }
    if (user.updatePasswordToken !== token) {
      throw new BadRequestException('Invalid token');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userService.updatePassword(user.email, hashedPassword);
    await this.userService.setUpdatePasswordToken(user.email, '');
    return {
      message: 'Password reset successfully',
    };
  }

  async enableOrDisable2FA(userId: string, enable: boolean) {
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    await this.userService.update2FA(user.email, enable);
    return {
      message: `2FA ${enable ? 'enabled' : 'disabled'} successfully`,
    };
  }
}
