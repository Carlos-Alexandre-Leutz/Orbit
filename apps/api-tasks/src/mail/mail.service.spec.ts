import { escapeHtml, formatMoney, MailService } from './mail.service';

describe('MailService order confirmation', () => {
  const mailer = { send: jest.fn().mockResolvedValue(undefined) };
  const service = new MailService(mailer);
  const order = {
    id: '6f1c1f0e-8a39-4a27-a2c1-1d6d8c7b0001',
    currency: 'USD',
    totalCents: 7000,
    items: [
      { name: 'Skillet', quantity: 2, priceCents: 2500 },
      { name: '<script>alert(1)</script> & Co', quantity: 1, priceCents: 2000 },
    ],
  };

  beforeEach(() => mailer.send.mockClear());

  it('lists the lines, the total and a link to the order', async () => {
    await service.sendOrderConfirmation('ana@example.com', order);
    const mail = mailer.send.mock.calls[0][0] as {
      to: string;
      subject: string;
      html: string;
      text: string;
    };
    expect(mail.to).toBe('ana@example.com');
    expect(mail.subject).toContain('6f1c1f0e');
    expect(mail.html).toContain('50.00 USD');
    expect(mail.html).toContain('Total: 70.00 USD');
    expect(mail.html).toContain(`/orders/${order.id}`);
    expect(mail.text).toContain('Total: 70.00 USD');
    expect(mail.text).toContain(`/orders/${order.id}`);
  });

  it('puts the reset link in the plain text', async () => {
    await service.sendPasswordReset('ana@example.com', 'tok123');
    const { text } = mailer.send.mock.calls[0][0] as { text: string };
    expect(text).toContain('/reset-password?token=tok123');
  });

  it('treats a product name as text, never as markup', async () => {
    await service.sendOrderConfirmation('ana@example.com', order);
    const { html } = mailer.send.mock.calls[0][0] as { html: string };
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; Co');
  });

  it('escapes the five special characters and formats cents', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
    );
    expect(formatMoney(5, 'USD')).toBe('0.05 USD');
  });
});
