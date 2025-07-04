export class BusinessLogicError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly meta?: Record<string, any>
  ) {
    super(message);
    this.name = 'BusinessLogicError';
    Object.setPrototypeOf(this, BusinessLogicError.prototype);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      meta: this.meta
    };
  }

  static isBusinessLogicError(error: any): error is BusinessLogicError {
    return error instanceof BusinessLogicError;
  }
}
