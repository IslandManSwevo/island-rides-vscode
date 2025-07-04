import { BaseService } from './base/BaseService';
import { platformService } from './PlatformService';

interface Environment {
  api: {
    baseUrl: string;
    timeout: number;
    version: string;
  };
  auth: {
    tokenExpiry: string;
    refreshThreshold: number;
  };
  features: {
    enableChat: boolean;
    enablePushNotifications: boolean;
    enableAnalytics: boolean;
  };
}

const development: Environment = {
  api: {
    baseUrl: 'http://localhost:3003',
    timeout: 10000,
    version: 'v1'
  },
  auth: {
    tokenExpiry: '24h',
    refreshThreshold: 1800 // 30 minutes in seconds
  },
  features: {
    enableChat: true,
    enablePushNotifications: true,
    enableAnalytics: false
  }
};

const production: Environment = {
  api: {
    baseUrl: 'https://api.islandrides.com',
    timeout: 30000,
    version: 'v1'
  },
  auth: {
    tokenExpiry: '24h',
    refreshThreshold: 1800
  },
  features: {
    enableChat: true,
    enablePushNotifications: true,
    enableAnalytics: true
  }
};

const staging: Environment = {
  ...production,
  api: {
    ...production.api,
    baseUrl: 'https://staging-api.islandrides.com'
  },
  features: {
    ...production.features,
    enableAnalytics: false
  }
};

class EnvironmentService extends BaseService {
  private config!: Environment;

  constructor() {
    super();
  }

  protected async onInit(): Promise<void> {
    await platformService.waitForInitialization();
    this.config = this.initializeConfig();
  }

  private initializeConfig(): Environment {
    if (__DEV__) {
      return platformService.select({
        ios: development,
        android: development,
        web: { ...development, api: { ...development.api, baseUrl: 'http://localhost:3003' } },
        default: development
      });
    }

    // Check for staging environment
    if (process.env.ENVIRONMENT === 'staging') {
      return staging;
    }

    return production;
  }

  getConfig(): Environment {
    return this.config;
  }

  get apiConfig() {
    return this.config.api;
  }

  get authConfig() {
    return this.config.auth;
  }

  get featureFlags() {
    return this.config.features;
  }
}

export const environmentService = EnvironmentService.getInstance();
