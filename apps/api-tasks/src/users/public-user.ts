import { User } from '@prisma/client';

/** What the API ever returns about a user: no password hash and no reset fields. */
export function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isAnonymous: user.isAnonymous,
    createdAt: user.createdAt,
  };
}
