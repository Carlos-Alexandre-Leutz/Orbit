import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { AuthenticatedRequest } from '../auth/authenticated-user';
import { Auth } from '../auth/roles.decorator';
import { ToolExecutor } from '../tools/tool-executor';
import { ApprovalsService } from './approvals.service';

export class ApproveDto {
  /** Required above the high-value limit: the exact amount in cents. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  confirmAmountCents?: number;
}

export class RejectDto {
  @IsOptional() @IsString() @MaxLength(200) reason?: string;
}

/** What waits for a person: list, look, approve (which also runs the call) or reject. */
@Controller('approvals')
@Auth()
export class ApprovalsController {
  constructor(
    private readonly approvals: ApprovalsService,
    private readonly executor: ToolExecutor,
  ) {}

  @Get()
  pending(@Req() request: AuthenticatedRequest) {
    return this.approvals.pendingOf(request.user.id);
  }

  @Get(':id')
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.approvals.get(id, request.user);
  }

  /** Approves and runs the call as the person it acts for; the answer says how the run ended. */
  @Post(':id/approve')
  @HttpCode(200)
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const approval = await this.approvals.approve(
      id,
      request.user,
      dto.confirmAmountCents,
    );
    const result = await this.executor.execute(approval.tool, approval.input, {
      actor: { id: approval.actorId, role: approval.actorRole },
      idempotencyKey: approval.idempotencyKey,
    });
    return { approval: await this.approvals.get(id, request.user), result };
  }

  @Post(':id/reject')
  @HttpCode(200)
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.approvals.reject(id, request.user, dto.reason);
  }
}
