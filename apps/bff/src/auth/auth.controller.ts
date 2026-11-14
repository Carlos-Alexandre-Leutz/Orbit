import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { callStoreApi } from '../upstream';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LoginDto } from './dto/login.dto';

/** Passes the browser's requests to the store API and keeps its status codes (409, 401, 400...). */
@Controller('auth')
export class AuthController {
  constructor(private readonly http: HttpService) {}

  @Post('register')
  register(@Body() body: Record<string, unknown>) {
    return callStoreApi(this.http, 'post', '/auth/register', {
      body,
      fallback: 'Error registering',
    });
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return callStoreApi(this.http, 'post', '/auth/login', {
      body: dto,
      fallback: 'Erro ao realizar login',
    });
  }

  @Post('anonymous')
  anonymous() {
    return callStoreApi(this.http, 'post', '/auth/anonymous', {
      fallback: 'Erro ao criar a sessão temporária',
    });
  }

  @Get('me')
  me(@Headers('authorization') authorization?: string) {
    return callStoreApi(this.http, 'get', '/auth/me', {
      authorization,
      fallback: 'Erro ao carregar a sessão',
    });
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return callStoreApi(this.http, 'post', '/auth/forgot-password', {
      body: { email: dto.email },
      fallback: 'Erro ao processar solicitação',
    });
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return callStoreApi(this.http, 'post', '/auth/reset-password', {
      body: dto,
      fallback: 'Erro ao resetar senha',
    });
  }
}
