import { HttpException } from '@nestjs/common';
import { ChatController } from './chat.controller';

function reply() {
  const written: string[] = [];
  return {
    written,
    headersSet: undefined as unknown,
    hijack: jest.fn(),
    getHeaders: () => ({
      'access-control-allow-origin': 'http://localhost:3000',
    }),
    raw: {
      writeHead: jest.fn(function (
        this: unknown,
        _status: number,
        headers: unknown,
      ) {
        (this as { headersSet: unknown }).headersSet = headers;
      }),
      write: (chunk: Uint8Array) => written.push(Buffer.from(chunk).toString()),
      end: jest.fn(),
    },
  };
}

describe('BFF ChatController', () => {
  const original = global.fetch;
  afterEach(() => {
    global.fetch = original;
  });

  it('passes the event stream through, keeping the headers already set', async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode('event: message\ndata: {"a":1}\n\n'),
        );
        controller.enqueue(
          new TextEncoder().encode('event: done\ndata: {}\n\n'),
        );
        controller.close();
      },
    });
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: true, status: 200, body: stream }) as never;
    const r = reply();
    await new ChatController().stream(
      { message: 'hi' },
      r as never,
      'Bearer t',
    );
    expect(r.written.join('')).toBe(
      'event: message\ndata: {"a":1}\n\nevent: done\ndata: {}\n\n',
    );
    expect(r.raw.writeHead).toHaveBeenCalledWith(
      200,
      expect.objectContaining({
        'Content-Type': 'text/event-stream',
        'access-control-allow-origin': 'http://localhost:3000',
      }),
    );
    expect(r.raw.end).toHaveBeenCalled();
    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer t',
    );
  });

  it('keeps the status and message of the store API when it refuses', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      body: null,
      json: () => Promise.resolve({ message: 'Unauthorized' }),
    }) as never;
    await expect(
      new ChatController().stream({ message: 'hi' }, reply() as never),
    ).rejects.toMatchObject({
      status: 401,
    });
  });

  it('answers 502 when the store API cannot be reached', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as never;
    const error = await new ChatController()
      .stream({ message: 'hi' }, reply() as never)
      .catch((e: HttpException) => e);
    expect((error as HttpException).getStatus()).toBe(502);
  });
});
