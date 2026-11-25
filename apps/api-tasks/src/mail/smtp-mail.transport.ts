import { MailerService } from '@nestjs-modules/mailer';
import { correlationHeaders } from '../correlation/correlation';
import { MailMessage, MailTransport } from './mail-transport';

/** Sends through an SMTP server (`MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`). */
export class SmtpMailTransport implements MailTransport {
  constructor(private readonly mailer: MailerService) {}

  async send({ to, subject, html }: MailMessage): Promise<void> {
    await this.mailer.sendMail({
      to,
      subject,
      html,
      headers: correlationHeaders(),
    });
  }
}
