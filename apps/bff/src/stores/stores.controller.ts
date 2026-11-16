import { Body, Controller, Get, Headers, Param, Patch } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import {
  ApiBearerAuth,
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

export class UpdateStoreBody {
  @ApiProperty({ required: false, example: 'Loja do João' })
  name?: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false, example: 'Handmade mugs' })
  tagline?: string;

  @ApiProperty({ required: false, example: '#2563eb' })
  primaryColor?: string;

  @ApiProperty({ required: false })
  contactEmail?: string;

  @ApiProperty({ required: false })
  contactPhone?: string;

  @ApiProperty({ required: false, nullable: true, format: 'uuid' })
  logoImageId?: string | null;

  @ApiProperty({ required: false, nullable: true, format: 'uuid' })
  coverImageId?: string | null;
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

  @Get('mine')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My own store (seller only)' })
  mine(@Headers('authorization') authorization?: string) {
    return callStoreApi(this.http, 'get', '/stores/mine', {
      authorization,
      fallback: 'Could not load your store',
    });
  }

  @Patch('mine')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Edit the name and description of my store' })
  update(
    @Body() body: UpdateStoreBody,
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(this.http, 'patch', '/stores/mine', {
      authorization,
      body,
      fallback: 'Could not save your store',
    });
  }

  @Get('mine/summary')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Numbers for the start page of the panel' })
  summary(@Headers('authorization') authorization?: string) {
    return callStoreApi(this.http, 'get', '/stores/mine/summary', {
      authorization,
      fallback: 'Could not load the summary',
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
