/**
 * Gives an existing user a role. Self-registration only creates customers, so this is how the
 * first admin and the sellers are made.
 *
 *   pnpm --filter @orbit/api-tasks set-role <email> <customer|seller|admin>
 *
 * It uses DATABASE_URL (apps/api-tasks/.env is loaded by Prisma).
 */
import { PrismaClient, Role } from '@prisma/client';

async function main() {
  const [email, roleArg] = process.argv.slice(2);
  const role = roleArg?.toUpperCase() as Role | undefined;
  if (!email || !role || !Object.values(Role).includes(role)) {
    console.error('Usage: set-role <email> <customer|seller|admin>');
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.update({ where: { email }, data: { role } });
    console.log(`${user.email} is now ${user.role}`);
  } catch {
    console.error(`No user with the e-mail ${email}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
