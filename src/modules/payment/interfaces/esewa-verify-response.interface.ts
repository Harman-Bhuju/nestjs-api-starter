import { PaymentStatus } from '../enums/payment-status.enum';

export interface EsewaVerifiedResponse {
  transaction_code: string;
  status: PaymentStatus;
  total_amount: number;
  transaction_uuid: string;
  product_code: string;
  signed_field_names: string;
  signature: string;
}

// {
//   "transaction_code": "000AWEO",

//   "status": "COMPLETE",

//   "total_amount": 1000.0,

//   "transaction_uuid": "250610-162413",

//   "product_code": "EPAYTEST",

//   "signed_field_names": "transaction_code, status, total_amount, transaction_uuid, product_code, signed_field_names",

//   "signature": "62GcfZTmVkzhtUeh+QJ1AqiJrjoWWGof3U+eTPTZ7fA="
// }
