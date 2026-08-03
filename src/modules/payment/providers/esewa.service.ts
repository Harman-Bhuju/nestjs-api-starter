import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID } from 'crypto';

import { PaymentGateway } from '../interfaces/payment.interface';
import { InitiatePaymentParams } from '../interfaces/initiate-payment-params.interface';
import { EsewaInitiateResponse } from '../interfaces/esewa-initiate-response.interface';
import { EsewaVerifiedResponse } from '../interfaces/esewa-verify-response.interface';

@Injectable()
export class EsewaService implements PaymentGateway {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Docs, "HMAC/SHA256" section: signature = HMAC-SHA256(message, secretKey), base64 output.
   * The "message" is built by joining `field=value` pairs for exactly the fields
   * listed in `signed_field_names`, IN THAT ORDER, separated by commas.
   * Docs' worked example:
   *   total_amount=100,transaction_uuid=11-201-13,product_code=EPAYTEST
   * Made generic (takes ANY field list) instead of hardcoding the 3 request
   * fields, because the CALLBACK response is signed over a different, longer
   * field list — see verify() below. One function, two use sites.
   */
  private generateSignature(
    fields: Record<string, string | number>,
    signedFieldNames: string,
  ): string {
    const secret = this.configService.getOrThrow<string>('ESEWA_SECRET_KEY');

    const message = signedFieldNames
      .split(',')
      .map((field) => `${field.trim()}=${fields[field.trim()]}`)
      .join(',');

    return createHmac('sha256', secret).update(message).digest('base64');
  }

  /**
   * Docs, "Integration" section: builds the form the user's browser will POST to eSewa.
   */
  async initiate(
    payment: InitiatePaymentParams,
  ): Promise<EsewaInitiateResponse> {
    const totalAmount = payment.amount;
    const productCode =
      this.configService.getOrThrow<string>('ESEWA_PRODUCT_CODE');

    // Docs: transaction_uuid "should be unique on every request. Supports alphanumeric and hyphen(-) only"
    const transactionUuid = `${Date.now()}-${randomUUID()}`;

    const signedFieldNames = 'total_amount,transaction_uuid,product_code';
    const signature = this.generateSignature(
      {
        total_amount: totalAmount,
        transaction_uuid: transactionUuid,
        product_code: productCode,
      },
      signedFieldNames,
    );

    return {
      action: this.configService.getOrThrow('ESEWA_PAYMENT_URL'),
      method: 'POST',
      transactionUuid,
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
   * a base64-encoded JSON body in the `data` query param. Must re-generate the
   * signature and compare — docs explicitly require verifying integrity this way.
   */
  async verify(data: string): Promise<EsewaVerifiedResponse> {
    let decoded: EsewaVerifiedResponse;

    try {
      decoded = JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));
    } catch {
      throw new BadRequestException('Invalid eSewa response payload');
    }

    const { signature, signed_field_names } = decoded;

    // Docs' response example shows signed_field_names as a DIFFERENT list than
    // the request used — read it from the payload itself rather than hardcoding.
    const expectedSignature = this.generateSignature(
      decoded as unknown as Record<string, string | number>,
      signed_field_names,
    );

    if (expectedSignature !== signature) {
      throw new BadRequestException(
        'Signature mismatch - response may be tampered with',
      );
    }

    if (decoded.status !== 'COMPLETE') {
      throw new BadRequestException(`Payment not complete: ${decoded.status}`);
    }

    return decoded;
  }

  /**
   * Docs, "Status Check" section: for when 5 minutes pass with no redirect back
   * from eSewa (user closed tab, network died, etc) — ask eSewa directly.
   */
  async checkStatus(
    transactionUuid: string,
    totalAmount: number,
  ): Promise<any> {
    const productCode =
      this.configService.getOrThrow<string>('ESEWA_PRODUCT_CODE');
    const baseUrl = this.configService.getOrThrow<string>(
      'ESEWA_STATUS_CHECK_URL',
    );

    const url = `${baseUrl}?product_code=${productCode}&total_amount=${totalAmount}&transaction_uuid=${transactionUuid}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new BadRequestException('Failed to reach eSewa status check API');
    }
    return response.json();
  }
}
