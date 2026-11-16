import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface StoredImage {
  contentType: string;
  data: Buffer;
}

/**
 * Where uploaded pictures live. The rest of the code only knows this port, so the database can be replaced by
 * a disk or an object store without touching the controllers.
 */
export abstract class ImageStorage {
  abstract save(
    storeId: string,
    contentType: string,
    data: Buffer,
  ): Promise<string>;
  abstract read(id: string): Promise<StoredImage | null>;
  /** How many of these ids are pictures of this store (used to refuse another store's picture). */
  abstract countOwned(storeId: string, ids: string[]): Promise<number>;
}

/** The adapter in use: pictures as rows of the database, which a host with a throw-away disk does not lose. */
@Injectable()
export class DatabaseImageStorage extends ImageStorage {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async save(storeId: string, contentType: string, data: Buffer) {
    const image = await this.prisma.image.create({
      data: { storeId, contentType, size: data.length, data },
      select: { id: true },
    });
    return image.id;
  }

  async read(id: string) {
    const image = await this.prisma.image.findUnique({
      where: { id },
      select: { contentType: true, data: true },
    });
    return image
      ? { contentType: image.contentType, data: Buffer.from(image.data) }
      : null;
  }

  countOwned(storeId: string, ids: string[]) {
    return this.prisma.image.count({ where: { storeId, id: { in: ids } } });
  }
}
