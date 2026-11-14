import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [UsersModule, AuthModule, CatalogModule, PrismaModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
