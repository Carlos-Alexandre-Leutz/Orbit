import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpException,
  HttpStatus,
  Param,
  Post,
  StreamableFile,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { callStoreApi } from '../upstream';

/** Pictures of a store: a seller uploads the file itself, everyone may read it. */
@ApiTags('images')
@Controller()
export class ImagesController {
  constructor(private readonly http: HttpService) {}

  @Post('uploads')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Upload a PNG, JPEG or WebP picture (2 MB at most) as the raw body',
  })
  upload(
    @Body() file: Buffer,
    @Headers('content-type') contentType: string,
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(this.http, 'post', '/uploads', {
      authorization,
      body: file,
      headers: { 'Content-Type': contentType },
      fallback: 'Could not upload the picture',
    });
  }

  @Get('images/:id')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiOperation({ summary: 'Read a picture' })
  async show(@Param('id') id: string) {
    try {
      const response = await firstValueFrom(
        this.http.get<ArrayBuffer>(
          `${process.env.TASKS_API_URL}/images/${encodeURIComponent(id)}`,
          { responseType: 'arraybuffer' },
        ),
      );
      return new StreamableFile(Buffer.from(response.data), {
        type: String(response.headers['content-type']),
      });
    } catch (error) {
      const status =
        (error as { response?: { status?: number } }).response?.status ??
        HttpStatus.BAD_GATEWAY;
      throw new HttpException('Picture not found', status);
    }
  }
}
