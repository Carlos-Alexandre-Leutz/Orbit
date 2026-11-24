import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { callStoreApi } from '../upstream';

export class ApproveBody {
  @ApiPropertyOptional({
    description:
      'Above the high-value limit: the exact amount of the approval, in cents',
  })
  confirmAmountCents?: number;
}

export class RejectBody {
  @ApiPropertyOptional({ maxLength: 200 }) reason?: string;
}

export class ApprovalDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() tool: string;
  @ApiProperty({ description: 'What the person is asked to approve' })
  summary: string;
  @ApiProperty({ nullable: true }) amountCents: number | null;
  @ApiProperty({ description: 'True above the limit: type the amount back' })
  needsAmountConfirmation: boolean;
  @ApiProperty({
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'EXECUTED'],
  })
  status: string;
}

/** What waits for a person to approve (an agent proposed it); the store API checks who may decide. */
@ApiTags('approvals')
@ApiBearerAuth()
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly http: HttpService) {}

  @Get()
  @ApiOperation({ summary: 'My calls waiting for approval' })
  pending(@Headers('authorization') authorization?: string) {
    return callStoreApi(this.http, 'get', '/approvals', {
      authorization,
      fallback: 'Could not load the approvals',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'One approval' })
  get(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(
      this.http,
      'get',
      `/approvals/${encodeURIComponent(id)}`,
      {
        authorization,
        fallback: 'Could not load the approval',
      },
    );
  }

  @Post(':id/approve')
  @HttpCode(200)
  @ApiOperation({ summary: 'Approve a call and run it' })
  approve(
    @Param('id') id: string,
    @Body() body: ApproveBody,
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(
      this.http,
      'post',
      `/approvals/${encodeURIComponent(id)}/approve`,
      { body, authorization, fallback: 'Could not approve' },
    );
  }

  @Post(':id/reject')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reject a call' })
  reject(
    @Param('id') id: string,
    @Body() body: RejectBody,
    @Headers('authorization') authorization?: string,
  ) {
    return callStoreApi(
      this.http,
      'post',
      `/approvals/${encodeURIComponent(id)}/reject`,
      { body, authorization, fallback: 'Could not reject' },
    );
  }
}
