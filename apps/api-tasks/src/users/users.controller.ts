import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Req,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-user';
import { Auth } from '../auth/roles.decorator';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UsersService } from './users.service';

@Controller('users')
@Auth('ADMIN')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.listPublic();
  }

  @Patch(':id/role')
  async changeRole(
    @Param('id') id: string,
    @Body() body: UpdateRoleDto,
    @Req() request: AuthenticatedRequest,
  ) {
    // An admin cannot demote themselves, so the last admin cannot lock everyone out.
    if (id === request.user.id) {
      throw new ForbiddenException('Você não pode alterar o seu próprio papel');
    }
    const user = await this.users.changeRole(id, body.role);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return user;
  }
}
