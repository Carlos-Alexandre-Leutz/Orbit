/** One message to send. `text` is for transports that only take plain text, `html` for those that take markup. */
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/** How a message leaves the API. The mail service builds the content and does not know which transport sends it. */
export interface MailTransport {
  send(message: MailMessage): Promise<void>;
}

export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');
