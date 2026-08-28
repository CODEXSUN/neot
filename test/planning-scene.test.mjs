import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizePlanningScene,
  planningSceneFromSerialized
} from "../apps/neot/web/src/modules/planning/planning.scene.ts";

test("removes transient Excalidraw collaborators from stored scenes", () => {
  const scene = normalizePlanningScene({
    appState: { collaborators: {}, theme: "light" },
    elements: [],
    files: {}
  });

  assert.deepEqual(scene.appState, { theme: "light" });
});

test("repairs serialized scenes with invalid collaborators", () => {
  const scene = planningSceneFromSerialized(
    JSON.stringify({ appState: { collaborators: {} }, elements: [] })
  );

  assert.equal("collaborators" in (scene.appState ?? {}), false);
});
