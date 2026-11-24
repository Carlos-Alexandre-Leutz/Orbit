import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';

/** Global so any tool or service can record an entry without importing the module (PBI-18 builds on it). */
@Global()
@Module({
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
