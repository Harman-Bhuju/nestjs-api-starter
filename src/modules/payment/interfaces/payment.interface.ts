import { InitiatePaymentParams } from './initiate-payment-params.interface';
import { EsewaInitiateResponse } from './esewa-initiate-response.interface';
import { EsewaVerifiedResponse } from './esewa-verify-response.interface';

export interface PaymentGateway {
  initiate(params: InitiatePaymentParams): Promise<EsewaInitiateResponse>;
  verify(data: string): Promise<EsewaVerifiedResponse>;
  checkStatus(transactionUuid: string, totalAmount: number): Promise<any>;
}
