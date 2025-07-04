import { BaseService } from './base/BaseService';
import { environmentService } from './EnvironmentService';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: any;
}

class LoggingService extends BaseService {
  private logs: LogEntry[] = [];
  private readonly MAX_LOGS = 1000;

  private shouldLog(level: LogLevel): boolean {
    if (!__DEV__ && level === 'debug') return false;
    return true;
  }

  private createLogEntry(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      data
    };
  }

  private store(entry: LogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift();
    }

    if (environmentService.featureFlags.enableAnalytics) {
      // Send logs to analytics service
      // this.analyticsService.logEvent('app_log', entry);
    }
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      const entry = this.createLogEntry('debug', message, data);
      console.debug(message, data);
      this.store(entry);
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      const entry = this.createLogEntry('info', message, data);
      console.info(message, data);
      this.store(entry);
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      const entry = this.createLogEntry('warn', message, data);
      console.warn(message, data);
      this.store(entry);
    }
  }

  error(message: string, error?: Error, data?: any): void {
    if (this.shouldLog('error')) {
      const entry = this.createLogEntry('error', message, { error, ...data });
      console.error(message, error, data);
      this.store(entry);
    }
  }

  getLogs(level?: LogLevel): LogEntry[] {
    return level 
      ? this.logs.filter(log => log.level === level)
      : [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

export const loggingService = LoggingService.getInstance();
