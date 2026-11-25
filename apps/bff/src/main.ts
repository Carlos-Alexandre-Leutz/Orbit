import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { validateEnv } from './config/validate-env';
import { registerCorrelation } from './correlation';

async function bootstrap() {
  validateEnv();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    // The payment webhook is forwarded with the exact bytes the provider signed.
    { rawBody: true },
  );
  registerCorrelation(app.getHttpAdapter().getInstance());
  // An upload is the picture itself: Fastify keeps it as bytes, up to the same 2 MB the store API allows.
  app
    .getHttpAdapter()
    .getInstance()
    .addContentTypeParser(
      /^image\/.*/,
      { parseAs: 'buffer', bodyLimit: 2 * 1024 * 1024 },
      (_request, body, done) => done(null, body),
    );
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['http://localhost:3000'];

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    exposedHeaders: ['X-Correlation-Id'],
  });

  const config = new DocumentBuilder()
    .setTitle('Orbit BFF API')
    .setDescription('Backend-for-frontend of the Orbit planning agent')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document);

  await app.listen({ port: 3001, host: '0.0.0.0' });

  console.log(`🚀 Front rodando em: http://localhost:3000/`);
  console.log(`🚀 BFF rodando em: http://localhost:3001`);
  console.log(`📑 Documentação: http://localhost:3001/docs`);
}
bootstrap();
