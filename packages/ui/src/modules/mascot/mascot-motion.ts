import type { MascotMode, Position } from "./mascot.contract";

const DISPLAY_WIDTH = 96;
const DISPLAY_HEIGHT = 104;
const SCREEN_PADDING = 20;
export const HOME_X = 64;
export const WALK_SPEED = 150;

export function clampPosition(position: Position): Position {
  return {
    x: Math.min(rightEdge(), Math.max(SCREEN_PADDING, position.x)),
    y: Math.min(bottomEdge(), Math.max(SCREEN_PADDING, position.y))
  };
}

export function rightEdge() {
  return Math.max(SCREEN_PADDING, window.innerWidth - DISPLAY_WIDTH - SCREEN_PADDING);
}

export function bottomEdge() {
  return Math.max(SCREEN_PADDING, window.innerHeight - DISPLAY_HEIGHT - SCREEN_PADDING);
}

export function walkingMode(from: Position, to: Position): MascotMode {
  return to.x < from.x ? "walking-left" : "walking-right";
}

export function travelDuration(from: Position, to: Position) {
  return Math.max(0.45, Math.abs(to.x - from.x) / WALK_SPEED);
}

export function nextRoamingPosition(position: Position): Position {
  const distance = 150 + Math.random() * 180;
  const canMoveLeft = position.x - distance >= SCREEN_PADDING;
  const canMoveRight = position.x + distance <= rightEdge();
  const direction = canMoveLeft && canMoveRight ? (Math.random() > 0.5 ? 1 : -1) : canMoveRight ? 1 : -1;
  return clampPosition({ ...position, x: position.x + direction * distance });
}

export function dragConstraints(position: Position) {
  return {
    bottom: bottomEdge() - position.y,
    left: SCREEN_PADDING - position.x,
    right: rightEdge() - position.x,
    top: SCREEN_PADDING - position.y
  };
}
