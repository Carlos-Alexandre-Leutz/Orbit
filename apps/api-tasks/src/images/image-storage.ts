import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
  /**
   * Deletes pictures of this store that nothing uses any more (no logo, banner or product shows them). With
   * `ids` it looks only at those, right away; without, it sweeps the store's pictures older than an hour, which
   * catches uploads that were never saved.
   */
  abstract removeUnused(storeId: string, ids?: string[]): Promise<void>;
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

  async removeUnused(storeId: string, ids?: string[]) {
    if (ids && ids.length === 0) return;
    const scope = ids
      ? Prisma.sql`i."id" = ANY(${ids}::text[])`
      : Prisma.sql`i."createdAt" < now() - interval '1 hour'`;
    await this.prisma.$executeRaw`
      DELETE FROM "Image" AS i
      WHERE i."storeId" = ${storeId}
        AND ${scope}
        AND NOT EXISTS (
          SELECT 1 FROM "Store" s
          WHERE s."logoImageId" = i."id" OR i."id" = ANY(s."bannerImageIds")
        )
        AND NOT EXISTS (
          SELECT 1 FROM "Product" p WHERE i."id" = ANY(p."imageIds")
        )`;
  }
}
