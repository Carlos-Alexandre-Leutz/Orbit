import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { validateEnv } from './config/validate-env';

async function bootstrap() {
  validateEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // The payment webhook is verified against the exact bytes the provider signed.
    rawBody: true,
  });

  // whitelist drops any field a DTO does not declare, such as a `role` sent at registration.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // An upload is the picture itself; one byte over the limit is refused here, before the app reads it.
  app.useBodyParser('raw', { type: 'image/*', limit: '2mb' });
  // Only the BFF calls this API, server to server, so no browser origin is allowed unless the owner lists one.
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (allowedOrigins.length > 0) {
    app.enableCors({ origin: allowedOrigins });
  }

  const rawPort = process.env.PORT;
  const parsedPort = rawPort ? parseInt(rawPort, 10) : NaN;
  const port = !Number.isNaN(parsedPort) && parsedPort > 0 ? parsedPort : 3002;

  await app.listen(port, '0.0.0.0');

  console.log(`✅ Microserviço API-TASKS rodando em: ${port}`);
}
bootstrap();
