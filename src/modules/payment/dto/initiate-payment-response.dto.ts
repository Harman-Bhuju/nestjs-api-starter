import { ApiProperty } from '@nestjs/swagger';

class EsewaFormFieldsDto {
  @ApiProperty({ example: 9.99 }) amount!: number;
  @ApiProperty({ example: 0 }) tax_amount!: number;
  @ApiProperty({ example: 9.99 }) total_amount!: number;
  @ApiProperty({ example: '1735000000000-9c3b3b1a-...' })
  transaction_uuid!: string;
  @ApiProperty({ example: 'EPAYTEST' }) product_code!: string;
  @ApiProperty({ example: 0 }) product_service_charge!: number;
  @ApiProperty({ example: 0 }) product_delivery_charge!: number;
  @ApiProperty({ example: 'http://localhost:5000/payment/success' })
  success_url!: string;
  @ApiProperty({ example: 'http://localhost:5000/payment/failure' })
  failure_url!: string;
  @ApiProperty({ example: 'total_amount,transaction_uuid,product_code' })
  signed_field_names!: string;
  @ApiProperty({ example: 'i94zsd3oXF6ZsSr/kGqT4sSzYQzjj1W/waxjWyRwaME=' })
  signature!: string;
}

/** Returned by POST /payment. Frontend auto-submits this as a hidden form POST to `action`. */
export class InitiatePaymentResponseDto {
  @ApiProperty({
    example: 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
  })
  action!: string;

  @ApiProperty({ example: 'POST' })
  method!: 'POST';

  @ApiProperty({ example: '1735000000000-9c3b3b1a-...' })
  transactionUuid!: string;

  @ApiProperty({ type: () => EsewaFormFieldsDto })
  fields!: EsewaFormFieldsDto;
}
