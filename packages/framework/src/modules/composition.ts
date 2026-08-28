/**
 * A module's public composition boundary. Dependencies are explicit so a module
 * can be assembled in production and substituted easily in tests.
 */
export type ComposedModule<TDependencies extends object> = {
  key: string;
  label: string;
  register: (dependencies: TDependencies) => Promise<void> | void;
};

export function defineModule<TDependencies extends object>(
  module: ComposedModule<TDependencies>
): ComposedModule<TDependencies> {
  return module;
}

export async function registerModules<TDependencies extends object>(
  modules: readonly ComposedModule<TDependencies>[],
  dependencies: TDependencies,
  hooks: {
    onReady?: (module: ComposedModule<TDependencies>) => void;
    onRegister?: (module: ComposedModule<TDependencies>) => void;
  } = {}
): Promise<void> {
  const keys = new Set<string>();

  for (const module of modules) {
    if (keys.has(module.key)) {
      throw new Error(`Module already composed: ${module.key}`);
    }
    keys.add(module.key);

    hooks.onRegister?.(module);
    await module.register(dependencies);
    hooks.onReady?.(module);
  }
}
