import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ROLES_KEY, RolesGuard } from './roles.guard';

/**
 * Protects a route or controller: a valid session is required and, when roles are given,
 * the user must have one of them (`@Auth()` alone means "any logged-in user").
 */
export const Auth = (...roles: Role[]) =>
  applyDecorators(
    SetMetadata(ROLES_KEY, roles),
    UseGuards(JwtAuthGuard, RolesGuard),
  );
