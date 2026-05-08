import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
// import { UsersModule } from './users/users.module';
// import { OtpModule } from './otp/otp.module';
// import { DevicesModule } from './devices/devices.module';
// import { EmailsModule } from './emails/emails.module';
// import { SessionsModule } from './sessions/sessions.module';
// import { SecurityModule } from './security/security.module';
// import { PrismaModule } from './prisma/prisma.module';
// import { RedisModule } from './redis/redis.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';

@Module({
  imports: [
    AuthModule,
    // UsersModule,
    // OtpModule,
    // DevicesModule,
    // EmailsModule,
    // SessionsModule,
    // SecurityModule,
    // PrismaModule,
    // RedisModule,
    MailerModule.forRoot({
      transport: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 1025,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      },
      template: {
        dir: __dirname + '/emails/templates',
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
