import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ChatBotService } from '../service/chat-bot.service';
import { ChatRequestDto } from '../dto/chat-request.dto';
import { ChatResponseDto } from '../dto/chat-response.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

const CHAT_BOT_THROTTLE_LIMIT = 10;
const CHAT_BOT_THROTTLE_TTL_MS = 60000;

@ApiTags('Chat Bot')
@ApiBearerAuth('access-token')
@Controller('chat-bot')
export class ChatBotController {
  constructor(private readonly chatBotService: ChatBotService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: { limit: CHAT_BOT_THROTTLE_LIMIT, ttl: CHAT_BOT_THROTTLE_TTL_MS },
  })
  @ApiOperation({
    summary: 'Ask the website assistant a question',
    description:
      'Sends a single, stateless message to the website assistant and returns its response. ' +
      'The assistant answers questions strictly related to this website (features, pricing, plans, FAQ, ' +
      'support, authentication, refund policy and terms), and personalizes replies using the authenticated ' +
      "visitor's name. Each request is fully independent: no conversation history is stored on the server " +
      'between calls.',
  })
  @ApiOkResponse({
    description:
      'The assistant successfully processed the message and generated a response.',
    type: ChatResponseDto,
  })
  @ApiBadRequestResponse({
    description:
      'The request body failed validation. This happens when "message" is missing, empty after trimming, ' +
      'or exceeds the 2000 character limit.',
  })
  @ApiUnauthorizedResponse({
    description:
      'The request is missing a valid bearer access token, or the provided token is invalid or expired.',
  })
  @ApiTooManyRequestsResponse({
    description: `The client exceeded the allowed rate limit of ${CHAT_BOT_THROTTLE_LIMIT} requests per minute for this endpoint.`,
  })
  @ApiInternalServerErrorResponse({
    description:
      'An unexpected internal error occurred while processing the request.',
  })
  @ApiServiceUnavailableResponse({
    description:
      'The upstream AI provider is temporarily unavailable, is rate limiting requests, or the request to it timed out.',
  })
  public async chat(
    @Body() chatRequestDto: ChatRequestDto,
    @CurrentUser('sub') userId: string,
  ): Promise<ChatResponseDto> {
    return this.chatBotService.chat(chatRequestDto, userId);
  }
}
