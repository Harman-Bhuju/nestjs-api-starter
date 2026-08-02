export class AppException extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);

    this.name = 'AppException';

    Error.captureStackTrace(this, AppException);
  }
}
