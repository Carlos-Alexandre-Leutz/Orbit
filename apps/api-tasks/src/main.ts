import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { validateEnv } from './config/validate-env';

async function bootstrap() {
  validateEnv();

  const app = await NestFactory.create(AppModule);

  // whitelist drops any field a DTO does not declare, such as a `role` sent at registration.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  const rawPort = process.env.PORT;
  const parsedPort = rawPort ? parseInt(rawPort, 10) : NaN;
  const port = !Number.isNaN(parsedPort) && parsedPort > 0 ? parsedPort : 3002;

  await app.listen(port, '0.0.0.0');

  console.log(`✅ Microserviço API-TASKS rodando em: ${port}`);
}
bootstrap();
