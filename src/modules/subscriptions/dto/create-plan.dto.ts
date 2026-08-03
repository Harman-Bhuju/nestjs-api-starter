import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsString,
  Length,
  Min,
  ValidateIf,
} from 'class-validator';
import { PlanTier } from '../enums/plan-tier.enum';
import { BillingInterval } from '../enums/billing-interval.enum';

export class CreatePlanDto {
  @ApiProperty({ enum: PlanTier, example: PlanTier.PRO })
  @IsEnum(PlanTier)
  tier!: PlanTier;

  @ApiPropertyOptional({
    enum: BillingInterval,
    description: 'Required for every tier except FREE.',
    example: BillingInterval.MONTHLY,
  })
  @ValidateIf((dto: CreatePlanDto) => dto.tier !== PlanTier.FREE)
  @IsEnum(BillingInterval)
  billingInterval?: BillingInterval;

  @ApiProperty({ example: 9.99, description: '0 for the FREE tier' })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({ example: 'Pro Monthly' })
  @IsString()
  @Length(1, 100)
  name!: string;
}
