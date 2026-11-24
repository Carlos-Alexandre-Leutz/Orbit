import { Inject, Injectable } from '@nestjs/common';
import { MAIL_TRANSPORT } from './mail-transport';
import type { MailTransport } from './mail-transport';

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
  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
  ) {}

  async sendPasswordReset(email: string, token: string) {
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    await this.transport.send({
      to: email,
      subject: 'Recuperação de Senha',
      text: `Você solicitou a alteração de senha. Abra o link abaixo para cadastrar uma nova senha:\n\n${resetUrl}\n\nSe você não solicitou essa alteração, ignore este e-mail. O link expira em 1 hora.`,
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

    const lines = order.items
      .map(
        (item) =>
          `- ${item.name} x${item.quantity}: ${formatMoney(item.priceCents * item.quantity, order.currency)}`,
      )
      .join('\n');

    await this.transport.send({
      to: email,
      subject: `Pedido ${order.id.slice(0, 8)} recebido`,
      text: `Recebemos o seu pedido ${order.id}. Ele será enviado depois que o pagamento for confirmado.\n\n${lines}\n\nTotal: ${formatMoney(order.totalCents, order.currency)}\n\nVer o pedido e pagar: ${baseUrl}/orders/${order.id}`,
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
