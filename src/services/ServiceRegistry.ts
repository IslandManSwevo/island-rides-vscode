import { BaseService } from './base/BaseService';
import { platformService } from './PlatformService';
import { environmentService } from './EnvironmentService';
import { storageService } from './storageService';
import { loggingService } from './LoggingService';
import { ErrorRecoveryManager } from './errors/ErrorRecoveryManager';
import { SessionRecoveryStrategy } from './errors/RecoveryStrategy';

class ServiceRegistry extends BaseService {
  private initializedServices: Set<string> = new Set();

  async initializeServices(): Promise<void> {
    try {
      // Initialize core services in order
      await this.initializePlatform();
      await this.initializeEnvironment();
      await this.initializeStorage();
      await this.initializeLogging();
      await this.initializeErrorRecovery();

      // Mark initialization as complete
      this.initializedServices.add('core');
    } catch (error) {
      console.error('Failed to initialize services:', error);
      throw error;
    }
  }

  private async initializePlatform(): Promise<void> {
    platformService.getConfig();
    this.initializedServices.add('platform');
  }

  private async initializeEnvironment(): Promise<void> {
    environmentService.getConfig();
    this.initializedServices.add('environment');
  }

  private async initializeStorage(): Promise<void> {
    await storageService.getUserPreferences();
    this.initializedServices.add('storage');
  }

  private async initializeLogging(): Promise<void> {
    loggingService.info('Initializing services...');
    this.initializedServices.add('logging');
  }

  private async initializeErrorRecovery(): Promise<void> {
    const errorManager = ErrorRecoveryManager.getInstance();
    errorManager.registerStrategy(new SessionRecoveryStrategy());
    this.initializedServices.add('errorRecovery');
  }

  isServiceInitialized(service: string): boolean {
    return this.initializedServices.has(service);
  }

  getInitializedServices(): string[] {
    return Array.from(this.initializedServices);
  }
}

export const serviceRegistry = ServiceRegistry.getInstance();
