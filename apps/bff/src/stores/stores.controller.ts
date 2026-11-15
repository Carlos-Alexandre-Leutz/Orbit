import { Controller, Get, Param } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import {
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { callStoreApi } from '../upstream';

export class StoreDto {
  @ApiProperty({
    example: 'loja-do-joao',
    description: 'The link of the store',
  })
  slug: string;

  @ApiProperty({ example: 'Loja do João' })
  name: string;

  @ApiProperty()
  description: string;
}

/** The stores are public: a buyer finds a store and opens it without an account. */
@ApiTags('stores')
@Controller('stores')
export class StoresController {
  constructor(private readonly http: HttpService) {}

  @Get()
  @ApiOperation({ summary: 'List the stores' })
  @ApiResponse({ status: 200, type: [StoreDto] })
  list() {
    return callStoreApi(this.http, 'get', '/stores', {
      fallback: 'Erro ao listar as lojas',
    });
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Read the store at a link' })
  @ApiResponse({ status: 200, type: StoreDto })
  @ApiResponse({ status: 404, description: 'No store has this link' })
  one(@Param('slug') slug: string) {
    return callStoreApi(
      this.http,
      'get',
      `/stores/${encodeURIComponent(slug)}`,
      {
        fallback: 'Erro ao carregar a loja',
      },
    );
  }
}
