export enum PaymentStatus {
  PENDING = 'PENDING', // docs: "Payment Initiated but not been completed yet"
  COMPLETE = 'COMPLETE', // docs: "Successful Payment"
  FULL_REFUND = 'FULL_REFUND', // docs: "Full Payment refunded to the customer"
  PARTIAL_REFUND = 'PARTIAL_REFUND', // docs: "Partial payment refunded to the customer"
  AMBIGUOUS = 'AMBIGUOUS', // docs: "Payment is at hult [sic] state" — needs manual review
  NOT_FOUND = 'NOT_FOUND', // docs: "Payment terminated at eSewa: Session expired"
  CANCELED = 'CANCELED', // docs: "Canceled/Reversed from eSewa side"
}
