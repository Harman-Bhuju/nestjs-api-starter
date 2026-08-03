export interface EsewaInitiateResponse {
  action: string; // eSewa URL from docs (rc-epay.esewa.com.np/... for test, epay.esewa.com.np/... for prod)
  method: 'POST'; // docs: the form must be submitted as POST, not GET
  transactionUuid: string; // NOT part of eSewa's own form fields — added ourselves so
  // PaymentService can save it to our DB right after calling initiate()

  fields: {
    amount: number; // price of the product itself
    tax_amount: number; // docs: must be 0 if unused, never null/empty
    total_amount: number; // docs: MUST equal amount + tax_amount + product_service_charge + product_delivery_charge
    transaction_uuid: string; // docs: unique per request, alphanumeric + hyphen only
    product_code: string; // docs: "merchant code provided by eSewa" (EPAYTEST for UAT)
    product_service_charge: number; // docs: 0 if unused
    product_delivery_charge: number; // docs: 0 if unused
    success_url: string; // docs: where eSewa redirects on success
    failure_url: string; // docs: where eSewa redirects on failure/pending
    signed_field_names: string; // docs: tells eSewa which fields were signed, and in what order
    signature: string; // docs: HMAC-SHA256 signature, base64 output
  };
}
