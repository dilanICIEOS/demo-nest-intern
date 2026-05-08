import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { DevicesModule } from 'src/devices/devices.module';
import { SessionsModule } from 'src/sessions/sessions.module';
import { OtpModule } from 'src/otp/otp.module';
import { EmailsModule } from 'src/emails/emails.module';

@Module({
  imports: [
    UsersModule,
    DevicesModule,
    SessionsModule,
    OtpModule,
    EmailsModule,
  ],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
