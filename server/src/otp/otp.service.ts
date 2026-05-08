import { Injectable } from '@nestjs/common';
import { EmailsService } from 'src/emails/emails.service';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class OtpService {
  constructor(
    private redisService: RedisService,
    private emailService: EmailsService,
  ) {}

  async generateAndSendOtp(
    userId: string,
    email: string,
    deviceId: string,
  ): Promise<boolean> {
    const otp: number = Math.floor(100000 + Math.random() * 900000);

    await this.redisService
      .getClient()
      .set(`otp:${userId}:${deviceId}`, otp.toString(), 'EX', 300);

    await this.emailService.sendEmail({
      to: email,
      subject: 'Your OTP Code',
      template: 'otp',
      context: {
        otp: otp.toString(),
      },
    });

    return true;
  }

  async verifyOtp(
    userId: string,
    deviceId: string,
    otp: string,
  ): Promise<boolean> {
    const storedOtp = await this.redisService
      .getClient()
      .get(`otp:${userId}:${deviceId}`);
    return storedOtp === otp;
  }

  async invalidateOtp(userId: string, deviceId: string): Promise<void> {
    await this.redisService.getClient().del(`otp:${userId}:${deviceId}`);
  }
}
