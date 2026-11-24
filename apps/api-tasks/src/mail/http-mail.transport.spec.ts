import { HttpMailTransport } from './http-mail.transport';
import { createMailTransport } from './mail.module';

describe('HttpMailTransport', () => {
  const message = {
    to: 'a@b.c',
    subject: 'Hi',
    text: 'Body',
    html: '<p>x</p>',
  };
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('posts the plain text to /v1/send with the token', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    await new HttpMailTransport('https://mail.test/', 'secret').send(message);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://mail.test/v1/send');
    expect((init.headers as Record<string, string>)['X-Api-Token']).toBe(
      'secret',
    );
    expect(JSON.parse(init.body as string)).toEqual({
      to: 'a@b.c',
      subject: 'Hi',
      message: 'Body',
    });
  });

  it('throws when the mail API refuses', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429 });
    await expect(
      new HttpMailTransport('https://mail.test', 't').send(message),
    ).rejects.toThrow('429');
  });

  it('needs the URL and the token when the provider is http', () => {
    expect(() =>
      createMailTransport({ MAIL_PROVIDER: 'http' }, {} as never),
    ).toThrow('MAIL_API_TOKEN');
  });
});
