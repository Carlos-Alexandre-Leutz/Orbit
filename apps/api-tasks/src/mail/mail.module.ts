import { Module } from '@nestjs/common';
import { MailerModule, MailerService } from '@nestjs-modules/mailer';
import { HttpMailTransport } from './http-mail.transport';
import { MAIL_TRANSPORT, MailTransport } from './mail-transport';
import { MailService } from './mail.service';
import { SmtpMailTransport } from './smtp-mail.transport';

/** `MAIL_PROVIDER=http` uses the mail API; anything else (the default) uses SMTP. */
export function createMailTransport(
  env: NodeJS.ProcessEnv,
  mailer: MailerService,
): MailTransport {
  if (env.MAIL_PROVIDER === 'http') {
    if (!env.MAIL_API_URL || !env.MAIL_API_TOKEN) {
      throw new Error(
        'MAIL_PROVIDER=http needs MAIL_API_URL and MAIL_API_TOKEN',
      );
    }
    return new HttpMailTransport(env.MAIL_API_URL, env.MAIL_API_TOKEN);
  }
  return new SmtpMailTransport(mailer);
}

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT),
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      },
      defaults: {
        from: `"Suporte" <${process.env.MAIL_FROM}>`,
      },
    }),
  ],
  providers: [
    {
      provide: MAIL_TRANSPORT,
      inject: [MailerService],
      useFactory: (mailer: MailerService) =>
        createMailTransport(process.env, mailer),
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
