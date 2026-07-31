export interface EsewaInitiateResponse {
  action: string;   // the eSewa URL from the docs (rc-epay.esewa.com.np/... for test, epay.esewa.com.np/... for prod)

  method: 'POST';   // docs: the form must be submitted as POST, not GET

  transactionUuid: string; // NOT part of eSewa's own form fields — we add this ourselves so
  // PaymentService can save it to our DB right after calling initiate()

  fields: {

    amount: number;                 // price of the product itself
    
    tax_amount: number;             // docs: must be 0 if unused, never null/empty

    total_amount: number;           // docs: MUST equal amount + tax_amount + product_service_charge + product_delivery_charge

    transaction_uuid: string;       // docs: unique per request, alphanumeric + hyphen only

    product_code: string;           // docs: "merchant code provided by eSewa" (EPAYTEST for UAT)

    product_service_charge: number; // docs: 0 if unused

    product_delivery_charge: number;// docs: 0 if unused

    success_url: string;            // docs: where eSewa redirects on success

    failure_url: string;            // docs: where eSewa redirects on failure/pending
    
    signed_field_names: string;     // docs: tells eSewa which fields were signed, and in what order

    signature: string;              // docs: HMAC-SHA256 signature, base64 output

  };
}


// <body>
//  <form action="https://rc-epay.esewa.com.np/api/epay/main/v2/form" method="POST">

//  <input type="text" id="amount" name="amount" value="100" required>

//  <input type="text" id="tax_amount" name="tax_amount" value ="10" required>

//  <input type="text" id="total_amount" name="total_amount" value="110" required>

//  <input type="text" id="transaction_uuid" name="transaction_uuid" value="241028" required>

//  <input type="text" id="product_code" name="product_code" value ="EPAYTEST" required>

//  <input type="text" id="product_service_charge" name="product_service_charge" value="0" required>

//  <input type="text" id="product_delivery_charge" name="product_delivery_charge" value="0" required>

//  <input type="text" id="success_url" name="success_url" value="https://developer.esewa.com.np/success" required>

//  <input type="text" id="failure_url" name="failure_url" value="https://developer.esewa.com.np/failure" required>

//  <input type="text" id="signed_field_names" name="signed_field_names" value="total_amount,transaction_uuid,product_code" required>

//  <input type="text" id="signature" name="signature" value="i94zsd3oXF6ZsSr/kGqT4sSzYQzjj1W/waxjWyRwaME=" required>

//  <input value="Submit" type="submit">

//  </form>
// </body>
