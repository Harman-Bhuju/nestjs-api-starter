import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { Public } from 'src/common/decorators/public.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { errorExample } from 'src/common/dto/error-response.dto';

import { SubscriptionsService } from '../service/subscriptions.service';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { PurchaseSubscriptionDto } from '../dto/purchase-subscription.dto';
import { PlanResponseDto } from '../dto/plan-response.dto';
import { SubscriptionResponseDto } from '../dto/subscription-response.dto';
import { PurchaseSubscriptionResponseDto } from '../dto/purchase-subscription-response.dto';
import { PlanTier } from '../enums/plan-tier.enum';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Public()
  @ApiOperation({
    summary: 'List all purchasable plans',
    description:
      'Public pricing catalog — no authentication required. Includes the FREE tier row (if seeded) purely for display; FREE is never purchased through POST /subscriptions/purchase.',
  })
  @ApiOkResponse({ description: 'List of plans.', type: [PlanResponseDto] })
  @Get('plans')
  listPlans() {
    return this.subscriptionsService.listPlans();
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Create a new plan',
    description:
      'Admin-only (enforced via the authorization table — see src/scripts/create-routes.ts — not a route decorator). Creates a row in the plan catalog. billingInterval is required for every tier except FREE.',
  })
  @ApiCreatedResponse({ description: 'Plan created.', type: PlanResponseDto })
  @ApiBadRequestResponse({
    description:
      'Validation failed (e.g. missing billingInterval for a non-FREE tier).',
    ...errorExample(400, ['billingInterval must be a valid enum value']),
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, expired, or otherwise invalid access token.',
    ...errorExample(401, 'Unauthorized'),
  })
  @ApiForbiddenResponse({
    description: "The caller's role is not authorized to call this endpoint.",
    ...errorExample(
      403,
      "Access denied. Role 'USER' cannot POST /subscriptions/plans",
    ),
  })
  @Post('plans')
  createPlan(@Body() dto: CreatePlanDto) {
    return this.subscriptionsService.createPlan(dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Purchase a paid plan',
    description:
      'Creates a PENDING subscription and an OPEN invoice for the authenticated user (userId is taken from the access token, never from the request body). Take the returned invoice.id and POST it to POST /payment as { payableType: "INVOICE", payableId }. The subscription only becomes ACTIVE once that payment succeeds. Rejects FREE-tier plans — those apply automatically and are never purchased.',
  })
  @ApiCreatedResponse({
    description: 'Subscription and invoice created, awaiting payment.',
    type: PurchaseSubscriptionResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'planId refers to the FREE tier, or failed DTO validation.',
    ...errorExample(
      400,
      'Free tier does not require purchase — it applies automatically when no active subscription exists',
    ),
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, expired, or otherwise invalid access token.',
    ...errorExample(401, 'Unauthorized'),
  })
  @ApiNotFoundResponse({
    description: 'No plan exists with the given planId.',
    ...errorExample(404, 'Plan not found'),
  })
  @Post('purchase')
  purchase(
    @CurrentUser('sub') userId: string,
    @Body() dto: PurchaseSubscriptionDto,
  ) {
    return this.subscriptionsService.purchase(userId, dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get the current tier for the authenticated user',
    description:
      'Derived value — returns the tier of the current ACTIVE subscription, or FREE if none exists. Never reads a stale/cached field; always computed from the subscription table at request time.',
  })
  @ApiOkResponse({
    description: 'Current tier.',
    schema: {
      type: 'object',
      properties: {
        tier: { enum: Object.values(PlanTier), example: PlanTier.FREE },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, expired, or otherwise invalid access token.',
    ...errorExample(401, 'Unauthorized'),
  })
  @Get('me/current-tier')
  async getCurrentTier(@CurrentUser('sub') userId: string) {
    return { tier: await this.subscriptionsService.getCurrentTier(userId) };
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List every subscription the current user has ever had',
    description:
      'Full history (PENDING/ACTIVE/EXPIRED), newest first — an audit trail, not just the active one.',
  })
  @ApiOkResponse({
    description: 'Subscription history.',
    type: [SubscriptionResponseDto],
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, expired, or otherwise invalid access token.',
    ...errorExample(401, 'Unauthorized'),
  })
  @Get('me')
  listMine(@CurrentUser('sub') userId: string) {
    return this.subscriptionsService.listMine(userId);
  }
}
