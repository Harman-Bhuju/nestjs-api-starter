import { LoggerService } from '@nestjs/common';

// This sends logs to BOTH Pino and the default NestJS console
// composite -> compose garera pathaune
export class CompositeLogger implements LoggerService {
  constructor(private readonly delegates: LoggerService[]) {}

  log(message: any, ...optionalParams: any[]) {
    for (const d of this.delegates) d.log(message, ...optionalParams);
  }
  error(message: any, ...optionalParams: any[]) {
    for (const d of this.delegates) d.error(message, ...optionalParams);
  }
  warn(message: any, ...optionalParams: any[]) {
    for (const d of this.delegates) d.warn(message, ...optionalParams);
  }
  debug?(message: any, ...optionalParams: any[]) {
    for (const d of this.delegates) {
      if (d.debug) d.debug(message, ...optionalParams);
    }
  }

  verbose?(message: any, ...optionalParams: any[]) {
    for (const d of this.delegates) {
      if (d.verbose) d.verbose(message, ...optionalParams);
    }
  }
}
