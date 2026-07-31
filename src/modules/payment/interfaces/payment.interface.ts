import { CreatePaymentDto } from "../dto/create-payment.dto";
import { EsewaInitiateResponse } from "./esewa-initiate-response.interface";

export interface PaymentGateway {

  initiate(payment: CreatePaymentDto): Promise<EsewaInitiateResponse>;

  verify(data: string): Promise<any>;

}