import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

// userId is deliberately NOT here — it's taken from the JWT (@CurrentUser('sub'))
// so a caller can never purchase a subscription on behalf of another user.
export class PurchaseSubscriptionDto {
  @ApiProperty({
    description: 'id of a non-FREE Plan (see GET /subscriptions/plans)',
    example: 'aB3dE9fG',
  })
  @IsString()
  planId!: string;
}
