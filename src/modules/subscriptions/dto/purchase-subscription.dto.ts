import { IsUUID } from 'class-validator';

export class PurchaseSubscriptionDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  planId!: string; // must NOT be a FREE-tier plan — service rejects that
}