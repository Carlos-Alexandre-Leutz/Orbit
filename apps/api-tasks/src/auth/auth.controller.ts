import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { AuthenticatedRequest } from './authenticated-user';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CreateStoreDto } from '../stores/dto/create-store.dto';
import { StoresService } from '../stores/stores.service';
import { Auth } from './roles.decorator';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly stores: StoresService,
  ) {}

  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post('anonymous')
  anonymous() {
    return this.authService.createAnonymous();
  }

  @Get('me')
  @Auth()
  me(@Req() request: AuthenticatedRequest) {
    return this.authService.me(request.user.id);
  }

  /**
   * The account names its store, which gives it its link. Any account may do it (a customer of other stores
   * becomes a seller too) and gets back a new session with the seller role.
   */
  @Post('store')
  @Auth('CUSTOMER', 'SELLER')
  async createStore(
    @Req() request: AuthenticatedRequest,
    @Body() body: CreateStoreDto,
  ) {
    const store = await this.stores.createOwn(request.user.id, body);
    return { ...(await this.authService.becomeSeller(request.user.id)), store };
  }

  @Post('forgot-password')
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }
}
