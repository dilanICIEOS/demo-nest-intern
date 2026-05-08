import { Module } from '@nestjs/common';
import { OtpService } from './otp.service';
import { RedisModule } from 'src/redis/redis.module';
import { EmailsModule } from 'src/emails/emails.module';

@Module({
  imports: [RedisModule, EmailsModule],
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
