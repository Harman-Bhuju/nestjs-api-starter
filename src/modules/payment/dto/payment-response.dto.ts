import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PayableType } from '../enums/payable-type.enum';
import { PaymentProvider } from '../enums/payment-provider.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { Payment } from '../entities/payment.entity';

export class PaymentResponseDto {
  @ApiProperty({ example: 'eF5gH1iJ' })
  id!: string;

  @ApiProperty({ enum: PayableType, example: PayableType.INVOICE })
  payableType!: PayableType;

  @ApiProperty({ example: 'cD4fG0hI' })
  payableId!: string;

  @ApiProperty({ example: '1735000000000-9c3b3b1a-...' })
  transactionUuid!: string;

  @ApiProperty({ example: 9.99 })
  amount!: number;

  @ApiProperty({ enum: PaymentProvider, example: PaymentProvider.ESEWA })
  provider!: PaymentProvider;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.COMPLETE })
  status!: PaymentStatus;

  @ApiPropertyOptional({ nullable: true, example: '000AWEO' })
  referenceId?: string | null;

  @ApiProperty({ example: '2026-01-15T09:30:00.000Z' })
  createdAt!: Date;

  static fromEntity(payment: Payment): PaymentResponseDto {
    const dto = new PaymentResponseDto();
    dto.id = payment.id;
    dto.payableType = payment.payableType;
    dto.payableId = payment.payableId;
    dto.transactionUuid = payment.transactionUuid;
    dto.amount = Number(payment.amount);
    dto.provider = payment.provider;
    dto.status = payment.status;
    dto.referenceId = payment.referenceId;
    dto.createdAt = payment.createdAt;
    return dto;
  }
}
