import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlanTier } from '../enums/plan-tier.enum';
import { BillingInterval } from '../enums/billing-interval.enum';
import { Plan } from '../entities/plan.entity';

export class PlanResponseDto {
  @ApiProperty({ example: 'aB3dE9fG' })
  id!: string;

  @ApiProperty({ enum: PlanTier, example: PlanTier.PRO })
  tier!: PlanTier;

  @ApiPropertyOptional({
    enum: BillingInterval,
    nullable: true,
    example: BillingInterval.MONTHLY,
  })
  billingInterval!: BillingInterval | null;

  @ApiProperty({ example: 9.99 })
  price!: number;

  @ApiProperty({ example: 'Pro Monthly' })
  name!: string;

  static fromEntity(plan: Plan): PlanResponseDto {
    const dto = new PlanResponseDto();
    dto.id = plan.id;
    dto.tier = plan.tier;
    dto.billingInterval = plan.billingInterval;
    dto.price = Number(plan.price);
    dto.name = plan.name;
    return dto;
  }
}