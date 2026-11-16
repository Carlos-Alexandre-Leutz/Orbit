import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { StoresService } from './stores.service';

describe('StoresService', () => {
  const prisma = {
    store: { findUnique: jest.fn(), findMany: jest.fn() },
  };
  const service = new StoresService(prisma as never);

  beforeEach(() => jest.resetAllMocks());

  it('finds the store of a seller, or refuses an account without one', async () => {
    prisma.store.findUnique.mockResolvedValueOnce({ id: 's1' });
    await expect(service.ofSeller('u1')).resolves.toEqual({ id: 's1' });
    expect(prisma.store.findUnique).toHaveBeenCalledWith({
      where: { ownerId: 'u1' },
    });
    prisma.store.findUnique.mockResolvedValueOnce(null);
    await expect(service.ofSeller('u2')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('answers 404 for a link that belongs to no store', async () => {
    prisma.store.findUnique.mockResolvedValue(null);
    await expect(service.bySlug('nowhere')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('shows the public part of a store and never its owner', async () => {
    prisma.store.findUnique.mockResolvedValue({
      id: 's1',
      slug: 'loja',
      name: 'Loja',
      description: 'Hi',
      ownerId: 'u1',
    });
    expect(await service.publicBySlug('loja')).toEqual({
      slug: 'loja',
      name: 'Loja',
      description: 'Hi',
    });
  });

  it('lists the stores with only public fields, by name', async () => {
    prisma.store.findMany.mockResolvedValue([]);
    await service.list();
    expect(prisma.store.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: {
          slug: true,
          name: true,
          description: true,
          tagline: true,
          primaryColor: true,
          logoImageId: true,
          coverImageId: true,
        },
        orderBy: [{ name: 'asc' }, { slug: 'asc' }],
      }),
    );
  });
});
