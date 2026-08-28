import type { PlanningScene } from "./planning.types";

export function planningSceneFromSerialized(serialized: string): PlanningScene {
  return normalizePlanningScene(JSON.parse(serialized));
}

export function normalizePlanningScene(value: unknown): PlanningScene {
  const scene = isRecord(value) ? value : {};
  const appState = isRecord(scene.appState) ? { ...scene.appState } : {};
  delete appState.collaborators;

  return {
    appState,
    elements: Array.isArray(scene.elements) ? scene.elements : [],
    files: isRecord(scene.files) ? scene.files : {}
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
