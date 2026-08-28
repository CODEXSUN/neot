"use client";

import { useEffect, useState } from "react";

import { mascotAtlas, type MascotMode } from "./mascot.contract";

type MascotSpriteProps = {
  mode: MascotMode;
  spriteSheetUrl: string;
};

export function MascotSprite({ mode, spriteSheetUrl }: MascotSpriteProps) {
  const animation = animationFor(mode);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    setFrame(0);
    const interval = window.setInterval(
      () => setFrame((current) => (current + 1) % animation.frameCount),
      animation.interval
    );
    return () => window.clearInterval(interval);
  }, [animation.frameCount, animation.interval]);

  const width = mascotAtlas.frameWidth * mascotAtlas.displayScale;
  const height = mascotAtlas.frameHeight * mascotAtlas.displayScale;
  return (
    <div
      className="pointer-events-none bg-no-repeat drop-shadow-[0_10px_10px_rgba(90,64,16,0.18)]"
      data-mascot-frame={frame}
      data-mascot-frame-count={animation.frameCount}
      style={{
        backgroundImage: `url(${spriteSheetUrl})`,
        backgroundPosition: `${-frame * width}px ${-animation.row * height}px`,
        backgroundSize: `${mascotAtlas.frameWidth * mascotAtlas.columns * mascotAtlas.displayScale}px ${mascotAtlas.frameHeight * mascotAtlas.totalRows * mascotAtlas.displayScale}px`,
        height,
        width
      }}
    />
  );
}

function animationFor(mode: MascotMode) {
  if (mode === "walking-left") {
    return { ...mascotAtlas.rows.runningLeft, interval: 130, row: mascotAtlas.rows.runningLeft.index };
  }
  if (mode === "walking-right") {
    return { ...mascotAtlas.rows.runningRight, interval: 130, row: mascotAtlas.rows.runningRight.index };
  }
  return { ...mascotAtlas.rows.idle, interval: 420, row: mascotAtlas.rows.idle.index };
}
