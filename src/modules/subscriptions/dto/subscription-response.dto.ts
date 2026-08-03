import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionStatus } from '../enums/subscription-status.enum';
import { Subscription } from '../entities/subscription.entity';
import { PlanResponseDto } from './plan-response.dto';

/** Requires `subscription.plan` to be loaded (relations: { plan: true }). */
export class SubscriptionResponseDto {
  @ApiProperty({ example: 'bC3eF9gH' })
  id!: string;

  @ApiProperty({ example: 'aB3dE9fG' })
  userId!: string;

  @ApiProperty({ type: () => PlanResponseDto })
  plan!: PlanResponseDto;

  @ApiProperty({ enum: SubscriptionStatus, example: SubscriptionStatus.ACTIVE })
  status!: SubscriptionStatus;

  @ApiPropertyOptional({ nullable: true, example: '2026-01-15T09:30:00.000Z' })
  currentPeriodStart!: Date | null;

  @ApiPropertyOptional({ nullable: true, example: '2026-02-15T09:30:00.000Z' })
  currentPeriodEnd!: Date | null;

  @ApiProperty({ example: '2026-01-15T09:30:00.000Z' })
  createdAt!: Date;

  static fromEntity(subscription: Subscription): SubscriptionResponseDto {
    const dto = new SubscriptionResponseDto();
    dto.id = subscription.id;
    dto.userId = subscription.userId;
    dto.plan = PlanResponseDto.fromEntity(subscription.plan);
    dto.status = subscription.status;
    dto.currentPeriodStart = subscription.currentPeriodStart;
    dto.currentPeriodEnd = subscription.currentPeriodEnd;
    dto.createdAt = subscription.createdAt;
    return dto;
  }
}
