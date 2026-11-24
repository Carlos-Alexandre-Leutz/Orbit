import { HttpException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AuthController } from './auth.controller';

describe('BFF AuthController', () => {
  const post = jest.fn();
  const get = jest.fn();
  const controller = new AuthController({ post, get } as never);

  beforeEach(() => {
    post.mockReset();
    get.mockReset();
  });

  it('returns what the store API answers', async () => {
    post.mockReturnValue(of({ data: { accessToken: 't' } }));
    await expect(
      controller.register({ email: 'a@example.com', password: 'x' }),
    ).resolves.toEqual({ accessToken: 't' });
  });

  it('keeps the 409 of a duplicate e-mail instead of turning it into a 500', async () => {
    post.mockReturnValue(
      throwError(() => ({
        response: {
          status: 409,
          data: { message: 'Este e-mail já está cadastrado' },
        },
      })),
    );
    const error = (await controller
      .register({ email: 'a@example.com', password: 'x' })
      .catch((e: unknown) => e)) as HttpException;
    expect(error.getStatus()).toBe(409);
    expect(error.message).toBe('Este e-mail já está cadastrado');
  });

  it('answers 502 when the store API cannot be reached', async () => {
    post.mockReturnValue(throwError(() => new Error('ECONNREFUSED')));
    const error = (await controller
      .login({ email: 'a@example.com', password: 'x' })
      .catch((e: unknown) => e)) as HttpException;
    expect(error.getStatus()).toBe(502);
  });

  it('forwards the Authorization header to the store API', async () => {
    get.mockReturnValue(of({ data: { id: 'u1' } }));
    await controller.me('Bearer abc');
    expect(get.mock.calls[0][1]).toEqual({
      headers: { Authorization: 'Bearer abc' },
    });
  });

  it('keeps the 401 and 403 of the store API', async () => {
    for (const status of [401, 403]) {
      get.mockReturnValue(
        throwError(() => ({ response: { status, data: { message: 'no' } } })),
      );
      const error = (await controller
        .me(undefined)
        .catch((e: unknown) => e)) as HttpException;
      expect(error.getStatus()).toBe(status);
    }
  });
});
