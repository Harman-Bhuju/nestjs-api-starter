import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { PaymentProvider } from '../enums/payment-provider.enum';
import { PayableType } from '../enums/payable-type.enum';

export class CreatePaymentDto {
  @ApiProperty({ enum: PayableType, example: PayableType.INVOICE })
  @IsEnum(PayableType)
  payableType!: PayableType;

  @ApiProperty({
    description:
      'id of the Invoice (or Order/Appointment, once implemented) being paid for',
    example: 'cD4fG0hI',
  })
  @IsString()
  payableId!: string;

  @ApiProperty({ enum: PaymentProvider, example: PaymentProvider.ESEWA })
  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;
}
