import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  const service = { listPublic: jest.fn(), changeRole: jest.fn() };
  const controller = new UsersController(service as never);
  const admin = { user: { id: 'admin-1', role: 'ADMIN' } } as never;

  beforeEach(() => jest.resetAllMocks());

  it('changes the role of another user', async () => {
    service.changeRole.mockResolvedValue({ id: 'u2', role: 'SELLER' });
    await expect(
      controller.changeRole('u2', { role: 'SELLER' }, admin),
    ).resolves.toEqual({ id: 'u2', role: 'SELLER' });
  });

  it('does not let an admin change their own role', async () => {
    await expect(
      controller.changeRole('admin-1', { role: 'CUSTOMER' }, admin),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.changeRole).not.toHaveBeenCalled();
  });

  it('answers not found for an unknown user', async () => {
    service.changeRole.mockResolvedValue(null);
    await expect(
      controller.changeRole('ghost', { role: 'SELLER' }, admin),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
