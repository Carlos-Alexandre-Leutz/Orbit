import { Role } from '@prisma/client';
import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  role: Role;
}

export type AuthenticatedRequest = Request & { user: AuthenticatedUser };
