import {
  BadRequestException,
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  StreamableFile,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/authenticated-user';
import { Auth } from '../auth/roles.decorator';
import { StoresService } from '../stores/stores.service';
import {
  checkUpload,
  IMAGE_TYPES,
  UPLOAD_MESSAGES,
  type UploadProblem,
} from './image-type';
import { ImageStorage } from './image-storage';

@Controller()
export class ImagesController {
  constructor(
    private readonly storage: ImageStorage,
    private readonly stores: StoresService,
  ) {}

  /** A seller uploads a picture of their own store; the body is the file itself (see main.ts for the limit). */
  @Post('uploads')
  @Auth('SELLER')
  async upload(@Req() request: AuthenticatedRequest & { body: unknown }) {
    const data = Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0);
    const result = checkUpload(data);
    if (!(IMAGE_TYPES as readonly string[]).includes(result)) {
      throw new BadRequestException(UPLOAD_MESSAGES[result as UploadProblem]);
    }
    const store = await this.stores.ofSeller(request.user.id);
    const id = await this.storage.save(store.id, result, data);
    return { id };
  }

  /** Pictures are public, like the storefront that shows them. The id cannot be guessed and never changes. */
  @Get('images/:id')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  @Header('X-Content-Type-Options', 'nosniff')
  async show(@Param('id', ParseUUIDPipe) id: string) {
    const image = await this.storage.read(id);
    if (!image) throw new NotFoundException('Picture not found');
    return new StreamableFile(image.data, { type: image.contentType });
  }
}
