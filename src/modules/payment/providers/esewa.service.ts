import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentGateway } from '../interfaces/payment.interface';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID } from 'crypto';
import { EsewaInitiateResponse } from '../interfaces/esewa-initiate-response.interface';
import { EsewaVerifiedResponse } from '../interfaces/esewa-verify-response.interface';


@Injectable()
export class EsewaService implements PaymentGateway {

    constructor(
        private readonly configService: ConfigService,
    ) { }

    /**
   * Docs, "HMAC/SHA256" section: signature = HMAC-SHA256(message, secretKey), base64 output.
   * The "message" is built by joining `field=value` pairs for exactly the fields
   * listed in `signed_field_names`, IN THAT ORDER, separated by commas.
   * Docs' worked example:
   *   total_amount=100,transaction_uuid=11-201-13,product_code=EPAYTEST
   * We made this generic (takes ANY field list) instead of hardcoding the 3 request
   * fields, because the CALLBACK response is signed over a different, longer field
   * list — see verify() below. One function, two use sites, no duplicated logic to
   * drift out of sync.
   */
    private generateSignature(
        fields: Record<string, string | number>, signedFieldNames: string
    ): string {

        const secret = this.configService.getOrThrow<string>('ESEWA_SECRET_KEY');

        const message = signedFieldNames
            .split(',')                                    // e.g. "total_amount,transaction_uuid,product_code" -> [3 names]
            .map((field) => `${field}=${fields[field]}`)   // -> ["total_amount=100", "transaction_uuid=...", ...]
            .join(',');                                    // -> "total_amount=100,transaction_uuid=...,product_code=..."

        return createHmac('sha256', secret).update(message).digest('base64');  // docs: base64 output
    }

    /**
   * Docs, "Integration" section: builds the form the user's browser will POST to eSewa.
   * Every field here maps directly to the docs' HTML <form> example.
   */
    async initiate(payment: CreatePaymentDto): Promise<EsewaInitiateResponse> {

        const totalAmount = payment.amount;
        const productCode = this.configService.getOrThrow<string>('ESEWA_PRODUCT_CODE');

        // Docs: transaction_uuid "should be unique on every request. Supports alphanumeric and hyphen(-) only"
        // Date.now() + randomUUID() guarantees uniqueness even under concurrent requests.
        const transactionUuid = `${Date.now()}-${randomUUID()}`;

        const signedFieldNames = 'total_amount,transaction_uuid,product_code'
        const signature = this.generateSignature(
            { total_amount: totalAmount, transaction_uuid: transactionUuid, product_code: productCode },
            signedFieldNames
        )

        return {

            action: this.configService.getOrThrow('ESEWA_PAYMENT_URL'),
            method: 'POST',
            transactionUuid: transactionUuid,
            fields: {
                amount: totalAmount,

                tax_amount: 0,

                total_amount: totalAmount,

                transaction_uuid: transactionUuid,

                product_code: productCode,

                product_service_charge: 0,

                product_delivery_charge: 0,

                success_url: this.configService.getOrThrow('ESEWA_SUCCESS_URL'),

                failure_url: this.configService.getOrThrow('ESEWA_FAILURE_URL'),

                signed_field_names: signedFieldNames,

                signature,
            },
        };
    }

    /**
     * Docs, "After Successful Payment" section: eSewa redirects to success_url with
     * a base64-encoded JSON body in the `data` query param. We MUST decode it, and
     * MUST re-generate the signature ourselves to check it matches the one eSewa sent —
     * docs explicitly say: "Make sure you verify the integrity of the response body
     * by comparing the signature that we have sent with the signature that you generate."
     */
    async verify(data: string): Promise<EsewaVerifiedResponse> {

        let decoded: EsewaVerifiedResponse;

        try {
            // Step 1: data is base64 TEXT -> Buffer.from(data, 'base64') decodes it to raw bytes
            // Step 2: .toString('utf-8') turns those bytes back into a readable string (a JSON string)
            // Step 3: JSON.parse(...) turns that JSON string into a real object we can read fields from
            decoded = JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));
        }
        catch {
            throw new BadRequestException('Invalid eSewa response payload');
        }

        const { signature, signed_field_names, ...rest } = decoded

        // Docs' response example shows signed_field_names as:
        // "transaction_code, status, total_amount, transaction_uuid, product_code, signed_field_names"
        // — a DIFFERENT list than the request used. We read it from the payload itself
        // rather than hardcoding it, since eSewa tells us exactly what it signed.
        const expectedSignature = this.generateSignature(
            decoded as unknown as Record<string, string | number>,
            signed_field_names,
        )

        if (expectedSignature !== signature) {
            // if this doesn't match, either the data was tampered with, or our
            // ESEWA_SECRET_KEY is wrong/mistyped — check your .env first when debugging this
            throw new BadRequestException('Signature mismatch - response may be tampered with')
        }

        if (decoded.status !== 'COMPLETE') {
            throw new BadRequestException(`Payment not complete: ${decoded.status}`)
        }

        return decoded;
    }

    /**
     * Docs, "Status Check" section: for when 5 minutes pass with no redirect back
     * from eSewa (user closed tab, network died, etc) — ask eSewa directly what happened.
     */
    async checkStatus(transactionUuid: string, totalAmount: number): Promise<any> {
        const productCode = this.configService.getOrThrow<string>('ESEWA_PRODUCT_CODE');
        const baseUrl = this.configService.getOrThrow<string>('ESEWA_STATUS_CHECK_URL');

        const url = `${baseUrl}?product_code=${productCode}&total_amount=${totalAmount}&transaction_uuid=${transactionUuid}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new BadRequestException('Failed to reach eSewa status check API');
        }
        return response.json();
    }
}
