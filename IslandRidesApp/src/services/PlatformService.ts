import { Platform, PlatformOSType } from 'react-native';
import { BaseService } from './base/BaseService';

export interface PlatformConfig {
  keyboardBehavior: 'padding' | 'height';
  keyboardOffset: number;
  bottomOffset: number;
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
}

class PlatformService extends BaseService {
  private config!: PlatformConfig;

  constructor() {
    super();
    this.initializeConfig();
  }

  protected async onInit(): Promise<void> {
    this.config = this.initializeConfig();
  }

  private initializeConfig(): PlatformConfig {
    const os = Platform.OS as PlatformOSType;
    
    return {
      keyboardBehavior: os === 'ios' ? 'padding' : 'height',
      keyboardOffset: os === 'ios' ? 64 : 0,
      bottomOffset: os === 'ios' ? 34 : 0,
      isIOS: os === 'ios',
      isAndroid: os === 'android',
      isWeb: os === 'web'
    };
  }

  getConfig(): PlatformConfig {
    return this.config;
  }

  select<T>(config: {
    ios?: T;
    android?: T;
    web?: T;
    default?: T;
  }): T {
    if (this.config.isIOS && config.ios !== undefined) return config.ios;
    if (this.config.isAndroid && config.android !== undefined) return config.android;
    if (this.config.isWeb && config.web !== undefined) return config.web;
    if (config.default !== undefined) return config.default;
    
    throw new Error('No platform-specific value provided');
  }
}

export const platformService = PlatformService.getInstance();
