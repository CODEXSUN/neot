import { useSyncExternalStore } from "react";

export const DESIGN_SYSTEM_COMPONENT_DEFAULTS_STORAGE_KEY =
  "codexsun.design-system.component-defaults";
export const DESIGN_SYSTEM_COMPONENT_DEFAULTS_EVENT = "codexsun:design-system-component-defaults";

export type DesignSystemComponentDefaults = Record<string, string>;

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getDesignSystemComponentDefaults(): DesignSystemComponentDefaults {
  if (!canUseStorage()) {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(DESIGN_SYSTEM_COMPONENT_DEFAULTS_STORAGE_KEY);
    if (!stored) {
      return {};
    }
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function getDesignSystemComponentDefault(componentId: string, fallback: string) {
  return getDesignSystemComponentDefaults()[componentId] ?? fallback;
}

export function setDesignSystemComponentDefault(componentId: string, variantId: string) {
  if (!canUseStorage()) {
    return;
  }

  const nextDefaults = {
    ...getDesignSystemComponentDefaults(),
    [componentId]: variantId
  };
  window.localStorage.setItem(
    DESIGN_SYSTEM_COMPONENT_DEFAULTS_STORAGE_KEY,
    JSON.stringify(nextDefaults)
  );
  window.dispatchEvent(
    new CustomEvent(DESIGN_SYSTEM_COMPONENT_DEFAULTS_EVENT, { detail: nextDefaults })
  );
}

export function useDesignSystemComponentDefault(componentId: string, fallback: string) {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") {
        return () => undefined;
      }
      window.addEventListener(DESIGN_SYSTEM_COMPONENT_DEFAULTS_EVENT, onStoreChange);
      window.addEventListener("storage", onStoreChange);
      return () => {
        window.removeEventListener(DESIGN_SYSTEM_COMPONENT_DEFAULTS_EVENT, onStoreChange);
        window.removeEventListener("storage", onStoreChange);
      };
    },
    () => getDesignSystemComponentDefault(componentId, fallback),
    () => fallback
  );
}
