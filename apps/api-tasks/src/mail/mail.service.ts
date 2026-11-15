import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

/** What the confirmation e-mail shows of an order. */
export interface OrderMailData {
  id: string;
  currency: string;
  totalCents: number;
  items: { name: string; quantity: number; priceCents: number }[];
}

/** Product names are data, never markup: they are escaped before they go into the e-mail. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatMoney(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendPasswordReset(email: string, token: string) {
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Recuperação de Senha',
      html: `
        <h1>Recuperação de Senha</h1>
        <p>Você solicitou a alteração de senha. Clique no link abaixo para cadastrar uma nova senha:</p>
        <p><a href="${resetUrl}" target="_blank">Resetar minha senha</a></p>
        <br />
        <p>Se você não solicitou essa alteração, ignore este e-mail.</p>
        <p>O link expira em 1 hora.</p>
      `,
    });
  }

  async sendOrderConfirmation(email: string, order: OrderMailData) {
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const rows = order.items
      .map(
        (item) =>
          `<tr><td>${escapeHtml(item.name)}</td><td>${item.quantity}</td><td>${formatMoney(item.priceCents * item.quantity, order.currency)}</td></tr>`,
      )
      .join('');

    await this.mailerService.sendMail({
      to: email,
      subject: `Pedido ${order.id.slice(0, 8)} recebido`,
      html: `
        <h1>Recebemos o seu pedido</h1>
        <p>Pedido <strong>${order.id}</strong>. Ele será enviado depois que o pagamento for confirmado.</p>
        <table>
          <thead><tr><th>Produto</th><th>Qtd.</th><th>Subtotal</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p><strong>Total: ${formatMoney(order.totalCents, order.currency)}</strong></p>
        <p><a href="${baseUrl}/orders/${order.id}" target="_blank">Ver o pedido e pagar</a></p>
      `,
    });
  }
}
