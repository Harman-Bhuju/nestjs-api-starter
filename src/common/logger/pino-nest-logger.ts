import { LoggerService } from '@nestjs/common';
import pino from 'pino';

// This class wraps Pino so NestJS can use it as its built-in logger
export class PinoNestLogger implements LoggerService {
  constructor(private readonly logger: pino.Logger) {}

  log(message: any, ...optionalParams: any[]) {
    this.logger.info({ extra: optionalParams }, String(message));
  }
  error(message: any, ...optionalParams: any[]) {
    this.logger.error({ extra: optionalParams }, String(message));
  }
  warn(message: any, ...optionalParams: any[]) {
    this.logger.warn({ extra: optionalParams }, String(message));
  }
  debug?(message: any, ...optionalParams: any[]) {
    this.logger.debug({ extra: optionalParams }, String(message));
  }
  verbose?(message: any, ...optionalParams: any[]) {
    this.logger.trace({ extra: optionalParams }, String(message));
  }
}
// its  just acting as a translator
// NestJS                 Pino
// ──────────────────────────────
// log()       ──────────► info()
// error()     ──────────► error()
// warn()      ──────────► warn()
// debug()     ──────────► debug()
// verbose()   ──────────► trace()
// trace = 10
// debug = 20
// info  = 30
// warn  = 40
// error = 50
// fatal = 60
