export enum InvoiceStatus {
  OPEN = 'OPEN', // created, waiting for payment
  PAID = 'PAID', // payment confirmed
  FAILED = 'FAILED', // payment attempt failed
}
