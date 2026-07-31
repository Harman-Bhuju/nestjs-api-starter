import { IsEnum, IsNumber, IsString, Min } from 'class-validator';
import { PaymentProvider } from '../enums/payment-provider.enum';
import { PayableType } from '../enums/payable-type.enum';

export class CreatePaymentDto {

  @IsEnum(PayableType)
  payableType!: PayableType;

  @IsString()
  payableId!: string;

  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;

}