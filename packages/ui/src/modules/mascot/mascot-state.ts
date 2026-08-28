import { mascotStorage, type MascotBehavior, type Position } from "./mascot.contract";
import { bottomEdge, clampPosition, HOME_X, rightEdge } from "./mascot-motion";

export class MascotStateStore {
  readBehavior(): MascotBehavior {
    if (typeof window === "undefined") return "roam";
    return window.localStorage.getItem(mascotStorage.behavior) === "stay" ? "stay" : "roam";
  }

  saveBehavior(behavior: MascotBehavior) {
    window.localStorage.setItem(mascotStorage.behavior, behavior);
  }

  readPosition(): Position | null {
    try {
      const value = window.localStorage.getItem(mascotStorage.position);
      return value ? clampPosition(JSON.parse(value) as Position) : null;
    } catch {
      return null;
    }
  }

  savePosition(position: Position) {
    window.localStorage.setItem(mascotStorage.position, JSON.stringify(clampPosition(position)));
  }

  isPositionPinned() {
    return (
      typeof window !== "undefined" &&
      window.localStorage.getItem(mascotStorage.positionPinned) === "true"
    );
  }

  pinPosition(position: Position) {
    this.savePosition(position);
    window.localStorage.setItem(mascotStorage.positionPinned, "true");
  }

  resetPosition() {
    window.localStorage.removeItem(mascotStorage.position);
    window.localStorage.removeItem(mascotStorage.positionPinned);
  }

  initialPosition(documentationMode: boolean): Position | null {
    const stored = this.readPosition();
    if (this.isPositionPinned() && stored) return stored;
    if (documentationMode) return documentationAnchorPosition();
    if (stored) return stored;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return clampPosition({ x: reducedMotion ? HOME_X : rightEdge(), y: bottomEdge() });
  }

  defaultPosition(documentationMode: boolean): Position {
    return documentationMode
      ? (documentationAnchorPosition() ?? this.leftPosition())
      : this.leftPosition();
  }

  private leftPosition() {
    return clampPosition({ x: HOME_X, y: bottomEdge() });
  }
}

export const mascotState = new MascotStateStore();

function documentationAnchorPosition(): Position | null {
  const anchor = document.querySelector<HTMLElement>("[data-honey-documentation-anchor]");
  if (!anchor) return null;
  const bounds = anchor.getBoundingClientRect();
  return clampPosition({
    x: bounds.left + Math.max(0, (bounds.width - 96) / 2),
    y: bounds.top + Math.max(0, (bounds.height - 104) / 2)
  });
}
