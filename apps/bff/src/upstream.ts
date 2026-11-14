import { HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

interface UpstreamError {
  response?: { status?: number; data?: { message?: string | string[] } };
}

/**
 * Calls the store API for the browser and keeps its status codes (401, 403, 409...).
 * The caller's `Authorization` header goes along, so the API decides who may do what.
 */
export async function callStoreApi(
  http: HttpService,
  method: 'get' | 'post' | 'patch' | 'delete',
  path: string,
  options: {
    body?: unknown;
    query?: Record<string, unknown>;
    authorization?: string;
    fallback: string;
  },
): Promise<unknown> {
  const url = `${process.env.TASKS_API_URL}${path}`;
  const config = {
    headers: options.authorization
      ? { Authorization: options.authorization }
      : {},
    params: options.query,
  };
  try {
    const response = await firstValueFrom(
      method === 'get' || method === 'delete'
        ? http[method](url, config)
        : http[method](url, options.body, config),
    );
    return response.data as unknown;
  } catch (error) {
    const upstream = (error as UpstreamError).response;
    throw new HttpException(
      upstream?.data?.message ?? options.fallback,
      upstream?.status ?? HttpStatus.BAD_GATEWAY,
    );
  }
}
