import {
  BadGatewayException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  RequestTimeoutException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { buildChatBotSystemPrompt } from '../constants/system-prompt';
import { ChatResponseDto } from '../dto/chat-response.dto';
import { ChatRequestDto } from '../dto/chat-request.dto';
import { UserService } from '../../user/service/user.service';

type OmniRouteRole = 'system' | 'user';

interface OmniRouteMessage {
  readonly role: OmniRouteRole;
  readonly content: string;
}

interface OmniRouteChoice {
  readonly message?: {
    readonly content?: string;
  };
}

interface OmniRouteChatCompletionResponse {
  readonly choices?: OmniRouteChoice[];
}

const ROLE_SYSTEM: OmniRouteRole = 'system';
const ROLE_USER: OmniRouteRole = 'user';
const CHAT_COMPLETIONS_PATH = '/chat/completions';

const HTTP_STATUS_TOO_MANY_REQUESTS = 429;
const HTTP_STATUS_SERVER_ERROR_THRESHOLD = 500;

@Injectable()
export class ChatBotService {
  private readonly logger = new Logger(ChatBotService.name);

  private readonly baseUrl: string;
  private readonly model: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly maxTokens: number;
  private readonly temperature: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    this.baseUrl = this.configService.getOrThrow<string>('AI_BASE_URL');
    this.model = this.configService.getOrThrow<string>('AI_MODEL');
    this.apiKey = this.configService.getOrThrow<string>('AI_API_KEY');
    this.timeoutMs = Number(
      this.configService.getOrThrow<string>('AI_TIMEOUT'),
    );
    this.maxTokens = Number(
      this.configService.getOrThrow<string>('AI_MAX_TOKENS'),
    );
    this.temperature = Number(
      this.configService.getOrThrow<string>('AI_TEMPERATURE'),
    );
  }

  public async chat(
    chatRequestDto: ChatRequestDto,
    userId: string,
  ): Promise<ChatResponseDto> {
    const startedAt = Date.now();
    this.logger.log(`Incoming chat-bot request received | model=${this.model}`);

    const visitorName = await this.resolveVisitorName(userId);
    const messages = this.buildMessages(chatRequestDto.message, visitorName);

    try {
      const rawResponse = await this.callOmniRoute(messages);
      const content = this.extractContent(rawResponse);

      this.logger.log(
        `Chat-bot request completed | model=${this.model} | executionTimeMs=${Date.now() - startedAt}`,
      );

      return { response: content };
    } catch (error) {
      this.logger.error(
        `Chat-bot request failed | model=${this.model} | executionTimeMs=${Date.now() - startedAt} | reason=${this.describeError(error)}`,
      );
      throw error;
    }
  }

  /**
   * Best-effort lookup of the visitor's first name so the bot can
   * personalize replies. Never lets a lookup failure break the chat —
   * falls back to an anonymous conversation instead.
   */
  private async resolveVisitorName(
    userId: string,
  ): Promise<string | undefined> {
    try {
      const user = await this.userService.getById(userId);
      return user.firstName;
    } catch (error) {
      this.logger.warn(
        `Could not resolve visitor name for personalization | reason=${this.describeError(error)}`,
      );
      return undefined;
    }
  }

  private buildMessages(
    userMessage: string,
    visitorName?: string,
  ): OmniRouteMessage[] {
    return [
      { role: ROLE_SYSTEM, content: buildChatBotSystemPrompt(visitorName) },
      { role: ROLE_USER, content: userMessage },
    ];
  }

  private async callOmniRoute(
    messages: OmniRouteMessage[],
  ): Promise<OmniRouteChatCompletionResponse> {
    const abortController = new AbortController();
    const timeoutHandle = setTimeout(
      () => abortController.abort(),
      this.timeoutMs,
    );

    try {
      const response = await fetch(`${this.baseUrl}${CHAT_COMPLETIONS_PATH}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: this.temperature,
          max_tokens: this.maxTokens,
          stream: false,
          messages,
        }),
        signal: abortController.signal,
      });

      return await this.parseOmniRouteResponse(response);
    } catch (error) {
      throw this.mapTransportError(error);
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  private async parseOmniRouteResponse(
    response: Response,
  ): Promise<OmniRouteChatCompletionResponse> {
    if (response.status === HTTP_STATUS_TOO_MANY_REQUESTS) {
      throw new ServiceUnavailableException(
        'The assistant is currently receiving too many requests. Please try again shortly.',
      );
    }

    if (response.status >= HTTP_STATUS_SERVER_ERROR_THRESHOLD) {
      throw new ServiceUnavailableException(
        'The assistant provider is temporarily unavailable. Please try again shortly.',
      );
    }

    if (!response.ok) {
      throw new BadGatewayException(
        'The assistant provider returned an unexpected error response.',
      );
    }

    return this.parseJsonBody(response);
  }

  private async parseJsonBody(
    response: Response,
  ): Promise<OmniRouteChatCompletionResponse> {
    try {
      return (await response.json()) as OmniRouteChatCompletionResponse;
    } catch {
      throw new BadGatewayException(
        'The assistant provider returned an invalid response format.',
      );
    }
  }

  private extractContent(rawResponse: OmniRouteChatCompletionResponse): string {
    const content = rawResponse?.choices?.[0]?.message?.content;

    if (!content || content.trim().length === 0) {
      throw new BadGatewayException(
        'The assistant did not return a valid response. Please try again.',
      );
    }

    return content.trim();
  }

  private mapTransportError(error: unknown): HttpException {
    if (error instanceof HttpException) {
      return error;
    }

    if (this.isAbortError(error)) {
      return new RequestTimeoutException(
        'The assistant took too long to respond. Please try again.',
      );
    }

    return new InternalServerErrorException(
      'An unexpected error occurred while contacting the assistant.',
    );
  }

  private isAbortError(error: unknown): boolean {
    return error instanceof Error && error.name === 'AbortError';
  }

  private describeError(error: unknown): string {
    if (error instanceof HttpException) {
      return error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }
}
