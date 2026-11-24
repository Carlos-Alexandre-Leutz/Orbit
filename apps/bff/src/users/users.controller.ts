import { Body, Controller, Get, Headers, Param, Patch } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { callStoreApi } from '../upstream';

/** Admin user management; the store API checks that the session belongs to an admin. */
@Controller('users')
export class UsersController {
  constructor(private readonly http: HttpService) {}

  @Get()
  list(@Headers('authorization') authorization?: string) {
    return callStoreApi(this.http, 'get', '/users', {
      authorization,
      fallback: 'Erro ao listar usuários',
    });
  }

  @Patch(':id/role')
  changeRole(
    @Param('id') id: string,
    @Body() body: { role: string },
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(
      this.http,
      'patch',
      `/users/${encodeURIComponent(id)}/role`,
      {
        body: { role: body.role },
        authorization,
        fallback: 'Erro ao alterar o papel',
      },
    );
  }
}
