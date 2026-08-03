import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionResponseDto } from './subscription-response.dto';
import { InvoiceResponseDto } from './invoice-response.dto';

/** Returned by POST /subscriptions/purchase. Frontend takes invoice.id and POSTs it to POST /payment. */
export class PurchaseSubscriptionResponseDto {
  @ApiProperty({ type: () => SubscriptionResponseDto })
  subscription!: SubscriptionResponseDto;

  @ApiProperty({ type: () => InvoiceResponseDto })
  invoice!: InvoiceResponseDto;
}
