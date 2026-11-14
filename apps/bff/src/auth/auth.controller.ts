import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LoginDto } from './dto/login.dto';

interface UpstreamError {
  response?: { status?: number; data?: { message?: string | string[] } };
}

/** Passes the browser's requests to the store API and keeps its status codes (409, 401, 400...). */
@Controller('auth')
export class AuthController {
  private readonly coreAuthUrl = process.env.TASKS_API_URL;

  constructor(private readonly httpService: HttpService) {}

  private async forward(path: string, body: unknown, fallback: string) {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.coreAuthUrl}/auth/${path}`, body),
      );
      return response.data as unknown;
    } catch (error) {
      const upstream = (error as UpstreamError).response;
      throw new HttpException(
        upstream?.data?.message ?? fallback,
        upstream?.status ?? HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Post('register')
  register(@Body() body: Record<string, unknown>) {
    return this.forward('register', body, 'Error registering');
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.forward('login', dto, 'Erro ao realizar login');
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.forward(
      'forgot-password',
      { email: dto.email },
      'Erro ao processar solicitação',
    );
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.forward('reset-password', dto, 'Erro ao resetar senha');
  }
}
