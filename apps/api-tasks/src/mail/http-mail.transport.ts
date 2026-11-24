import { MailMessage, MailTransport } from './mail-transport';

/**
 * Sends through the owner's free-email-send-api (`POST <url>/v1/send`, token in `X-Api-Token`).
 * That API takes plain text, so the message goes as `text`.
 */
export class HttpMailTransport implements MailTransport {
  constructor(
    private readonly apiUrl: string,
    private readonly token: string,
    private readonly timeoutMs = 10_000,
  ) {}

  async send({ to, subject, text }: MailMessage): Promise<void> {
    const response = await fetch(`${this.apiUrl.replace(/\/+$/, '')}/v1/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Token': this.token,
      },
      body: JSON.stringify({ to, subject, message: text }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) {
      throw new Error(`The mail API answered ${response.status}`);
    }
  }
}
