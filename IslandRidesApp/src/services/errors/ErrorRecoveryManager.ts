import { BusinessLogicError } from './BusinessLogicError';
import { RecoveryStrategy } from './RecoveryStrategy';

export class ErrorRecoveryManager {
  private static instance: ErrorRecoveryManager;
  private strategies: RecoveryStrategy[] = [];

  private constructor() {}

  static getInstance(): ErrorRecoveryManager {
    if (!ErrorRecoveryManager.instance) {
      ErrorRecoveryManager.instance = new ErrorRecoveryManager();
    }
    return ErrorRecoveryManager.instance;
  }

  registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.push(strategy);
    // Sort strategies by priority (highest first)
    this.strategies.sort((a, b) => b.priority - a.priority);
  }

  async attemptRecovery(error: BusinessLogicError): Promise<boolean> {
    for (const strategy of this.strategies) {
      if (strategy.canRecover(error)) {
        try {
          await strategy.recover(error);
          return true;
        } catch (recoveryError) {
          console.error('Recovery strategy failed:', recoveryError);
          continue;
        }
      }
    }
    return false;
  }
}
