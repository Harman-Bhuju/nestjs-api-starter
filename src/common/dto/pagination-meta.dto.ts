import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Cursor-pagination metadata, matching the shape UserService.list() (and any future cursor-paginated endpoint) returns. */
export class PaginationMetaDto {
  @ApiProperty({
    description: 'Page size that was actually applied (after capping)',
    example: 10,
  })
  limit!: number;

  @ApiPropertyOptional({
    nullable: true,
    description:
      'Pass this value as `cursorId` on the next request to fetch the following page. Null when there are no more results.',
    example: 'aB3dE9fG',
  })
  nextCursorId!: string | null;

  @ApiProperty({
    description: 'Whether another page of results exists',
    example: true,
  })
  hasNextPage!: boolean;
}
