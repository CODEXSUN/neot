export type ModuleScope = "industry" | "integration" | "platform" | "tenant";

export type ModuleContract = {
  displayName: string;
  migrationKey?: string;
  moduleKey: string;
  requiredFeatureKey?: string;
  requiredPermissions?: string[];
  scope: ModuleScope;
  version: string;
};

export class ModuleRegistry {
  private readonly modules = new Map<string, ModuleContract>();

  get(key: string): ModuleContract | undefined {
    return this.modules.get(key);
  }

  list(): ModuleContract[] {
    return [...this.modules.values()];
  }

  listByScope(scope: ModuleScope): ModuleContract[] {
    return this.list().filter((m) => m.scope === scope);
  }

  register(module: ModuleContract): void {
    if (this.modules.has(module.moduleKey)) {
      throw new Error(`Module already registered: ${module.moduleKey}`);
    }
    this.modules.set(module.moduleKey, module);
  }
}
