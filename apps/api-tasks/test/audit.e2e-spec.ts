import { AuditOutcome, Prisma, PrismaClient } from '@prisma/client';

/** Thrown on purpose to roll a transaction back, so the test leaves no row in an append-only table. */
class Rollback extends Error {}

/**
 * The audit log must refuse to change at the database, not only in the code (PBI-11, ADR-010). Every attempt
 * runs inside a transaction that is rolled back, because a row written here could never be deleted again.
 */
describe('audit_log is append-only (e2e)', () => {
  const prisma = new PrismaClient();

  afterAll(() => prisma.$disconnect());

  /** Inserts a row, runs `statement` against it and returns the error the database raised, if any. */
  async function attempt(
    statement: (id: string, tx: Prisma.TransactionClient) => Promise<unknown>,
  ): Promise<{ error?: Error; rowsAfter: number }> {
    let error: Error | undefined;
    let rowsAfter = -1;
    try {
      await prisma.$transaction(async (tx) => {
        const entry = await tx.auditEntry.create({
          data: { tool: 'test.append_only', outcome: AuditOutcome.SUCCESS },
        });
        try {
          await statement(entry.id, tx);
        } catch (e) {
          error = e as Error;
        }
        // The transaction is aborted after a refused statement; this only runs when nothing was refused.
        if (!error) {
          rowsAfter = await tx.auditEntry.count({ where: { id: entry.id } });
        }
        throw new Rollback();
      });
    } catch (e) {
      if (!(e instanceof Rollback)) throw e;
    }
    return { error, rowsAfter };
  }

  it('accepts an insert and a read', async () => {
    const { error, rowsAfter } = await attempt(() => Promise.resolve());
    expect(error).toBeUndefined();
    expect(rowsAfter).toBe(1);
  });

  it('rejects an UPDATE', async () => {
    const { error } = await attempt((id, tx) =>
      tx.$executeRawUnsafe(
        `UPDATE "audit_log" SET "tool" = 'tampered' WHERE "id" = $1`,
        id,
      ),
    );
    expect(error?.message).toMatch(/append-only/);
  });

  it('rejects a DELETE', async () => {
    const { error } = await attempt((id, tx) =>
      tx.$executeRawUnsafe(`DELETE FROM "audit_log" WHERE "id" = $1`, id),
    );
    expect(error?.message).toMatch(/append-only/);
  });

  it('rejects a TRUNCATE', async () => {
    const { error } = await attempt((_id, tx) =>
      tx.$executeRawUnsafe(`TRUNCATE TABLE "audit_log"`),
    );
    expect(error?.message).toMatch(/append-only/);
  });

  it('rejects the same changes made through the Prisma client', async () => {
    const update = await attempt((id, tx) =>
      tx.auditEntry.update({ where: { id }, data: { tool: 'tampered' } }),
    );
    expect(update.error).toBeDefined();
    const remove = await attempt((id, tx) =>
      tx.auditEntry.delete({ where: { id } }),
    );
    expect(remove.error).toBeDefined();
  });
});
