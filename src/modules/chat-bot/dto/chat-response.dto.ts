import { ApiProperty } from '@nestjs/swagger';

export class ChatResponseDto {
  @ApiProperty({
    description: "The assistant-generated response to the visitor's message.",
    example:
      'We offer three plans: Free, Pro, and Enterprise. The Pro plan includes priority support and advanced analytics. ' +
      'For exact pricing, please check our pricing page.',
  })
  response!: string;
}
