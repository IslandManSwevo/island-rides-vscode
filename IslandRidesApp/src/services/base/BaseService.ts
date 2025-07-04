export abstract class BaseService {
  private static readonly instances = new Map<string, BaseService>();
  private static readonly initialized = new Set<string>();
  
  constructor() {
    const name = this.constructor.name;
    if (BaseService.instances.has(name)) {
      return BaseService.instances.get(name)!;
    }
    BaseService.instances.set(name, this);
  }
  
  static getInstance<T extends BaseService>(this: { new(): T }): T {
    const name = this.name;
    if (!BaseService.instances.has(name)) {
      const instance = new this();
      if (!BaseService.initialized.has(name) && instance.onInit) {
        instance.onInit().then(() => {
          BaseService.initialized.add(name);
        }).catch(error => {
          console.error(`Failed to initialize ${name}:`, error);
        });
      }
    }
    return BaseService.instances.get(name) as T;
  }

  protected onInit?(): Promise<void>;
  
  public isInitialized(): boolean {
    return BaseService.initialized.has(this.constructor.name);
  }
  
  public async waitForInitialization(): Promise<void> {
    if (this.isInitialized()) return;
    
    return new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.isInitialized()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }
}
