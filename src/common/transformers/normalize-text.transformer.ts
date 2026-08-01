import { TransformFnParams } from 'class-transformer';

export function normalizeText({ value }: TransformFnParams) {
    return typeof value === 'string'
        ? value.trim().replace(/\s+/g, ' ')
        : value;
}