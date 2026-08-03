/**
 * What a PaymentGateway.initiate() actually needs. Deliberately just the
 * amount — PaymentService already resolved it (and checked ownership)
 * before calling the gateway; the gateway itself has no business knowing
 * about payableType/payableId.
 */
export interface InitiatePaymentParams {
  amount: number;
}
