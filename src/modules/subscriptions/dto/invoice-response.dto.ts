import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus } from '../enums/invoice-status.enum';
import { Invoice } from '../entities/invoice.entity';

export class InvoiceResponseDto {
  @ApiProperty({ example: 'cD4fG0hI' })
  id!: string;

  @ApiProperty({ example: 'bC3eF9gH' })
  subscriptionId!: string;

  @ApiProperty({ example: 9.99 })
  amountDue!: number;

  @ApiProperty({ enum: InvoiceStatus, example: InvoiceStatus.OPEN })
  status!: InvoiceStatus;

  @ApiPropertyOptional({ nullable: true, example: '2026-01-15T09:30:00.000Z' })
  periodStart!: Date | null;

  @ApiPropertyOptional({ nullable: true, example: '2026-02-15T09:30:00.000Z' })
  periodEnd!: Date | null;

  @ApiProperty({ example: '2026-01-15T09:30:00.000Z' })
  createdAt!: Date;

  static fromEntity(invoice: Invoice): InvoiceResponseDto {
    const dto = new InvoiceResponseDto();
    dto.id = invoice.id;
    dto.subscriptionId = invoice.subscriptionId;
    dto.amountDue = Number(invoice.amountDue);
    dto.status = invoice.status;
    dto.periodStart = invoice.periodStart;
    dto.periodEnd = invoice.periodEnd;
    dto.createdAt = invoice.createdAt;
    return dto;
  }
}
