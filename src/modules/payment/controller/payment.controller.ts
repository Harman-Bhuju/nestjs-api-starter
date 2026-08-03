import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { Public } from 'src/common/decorators/public.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { errorExample } from 'src/common/dto/error-response.dto';

import { PaymentService } from '../service/payment.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { InitiatePaymentResponseDto } from '../dto/initiate-payment-response.dto';
import { PaymentResponseDto } from '../dto/payment-response.dto';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(
    private readonly configService: ConfigService,
    private readonly paymentService: PaymentService,
  ) {}

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Initiate a payment for a payable (e.g. an invoice)',
    description:
      'Resolves the amount owed for the given payableType/payableId server-side (never trusts a client-supplied amount) and enforces that the authenticated user actually owns that payable. Returns an eSewa form descriptor — the frontend auto-submits it as a hidden form POST to `action`.',
  })
  @ApiCreatedResponse({
    description: 'eSewa form descriptor to auto-submit.',
    type: InitiatePaymentResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Unsupported payableType, or DTO validation failed.',
    ...errorExample(400, 'Unsupported payable type'),
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, expired, or otherwise invalid access token.',
    ...errorExample(401, 'Unauthorized'),
  })
  @ApiNotFoundResponse({
    description: 'No payable exists with the given payableId.',
    ...errorExample(404, 'Invoice not found'),
  })
  @Post()
  create(@CurrentUser('sub') userId: string, @Body() dto: CreatePaymentDto) {
    return this.paymentService.createPayment(userId, dto);
  }

  @Public()
  @ApiOperation({
    summary: 'eSewa success redirect (not called directly by clients)',
    description:
      "eSewa redirects the user's browser here with ?data=<base64> after a successful payment. Verifies the signature, marks the Payment COMPLETE, runs the domain-specific success hook (e.g. activating a subscription), then redirects to the frontend. Public — eSewa does not send an access token.",
  })
  @ApiQuery({
    name: 'data',
    description: 'Base64-encoded JSON payload from eSewa',
  })
  @Get('success')
  async success(@Query('data') data: string, @Res() res: Response) {
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
    try {
      const payment = await this.paymentService.handleCallback(data);
      return res.redirect(`${frontendUrl}/payment-success/${payment.id}`);
    } catch {
      return res.redirect(`${frontendUrl}/payment-failed`);
    }
  }

  @Public()
  @ApiOperation({
    summary: 'eSewa failure redirect (not called directly by clients)',
    description:
      'eSewa redirects here when the user cancels or the payment fails. Public — no token is sent.',
  })
  @Get('failure')
  failure(@Res() res: Response) {
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
    return res.redirect(`${frontendUrl}/payment-failed`);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Reconcile a payment that never redirected back',
    description:
      "Safety net for when eSewa's redirect never arrives (tab closed, network died). Asks eSewa's status-check API directly and updates the local Payment row + runs the same domain hooks handleCallback would have. Only the owner of the underlying payable may reconcile it.",
  })
  @ApiParam({ name: 'transactionUuid', example: '1735000000000-9c3b3b1a-...' })
  @ApiOkResponse({
    description: 'Updated payment record.',
    type: PaymentResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, expired, or otherwise invalid access token.',
    ...errorExample(401, 'Unauthorized'),
  })
  @ApiNotFoundResponse({
    description: 'No payment exists with the given transactionUuid.',
    ...errorExample(404, 'Payment record not found'),
  })
  @Get('status/:transactionUuid')
  reconcile(
    @CurrentUser('sub') userId: string,
    @Param('transactionUuid') transactionUuid: string,
  ) {
    return this.paymentService.reconcile(transactionUuid, userId);
  }

  // Frontend polling (simplified):
  // async function pollPaymentStatus(transactionUuid: string) {
  //   const res = await fetch(`/payment/status/${transactionUuid}`, { headers: { Authorization: `Bearer ${token}` } });
  //   const payment = await res.json();
  //   if (payment.status === 'COMPLETE') { /* redirect to success page */ }
  //   else if (['CANCELED', 'NOT_FOUND'].includes(payment.status)) { /* redirect to failure page */ }
  //   else { /* still PENDING/AMBIGUOUS — poll again, up to some max attempts */ }
  // }
}
