import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailData } from './types/email.types';

@Injectable()
export class EmailsService {
  constructor(private readonly mailerService: MailerService) {}

  async sendEmail(emailData: EmailData): Promise<void> {
    await this.mailerService.sendMail({
      to: emailData.to,
      subject: emailData.subject,
      template: emailData.template,
      context: emailData.context,
    });
  }
}
