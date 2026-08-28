"use client";

import { useEffect, useState } from "react";

const VISIBILITY_KEY = "neot.screen-companion.visible";
export const mascotVisibilityEvent = "neot:screen-companion-visibility";

export function useMascotVisibility(enabled: boolean) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const storedValue = window.localStorage.getItem(VISIBILITY_KEY);
    setVisible(storedValue === null ? true : storedValue === "true");
    const update = (event: Event) => setVisible((event as CustomEvent<boolean>).detail);
    window.addEventListener(mascotVisibilityEvent, update);
    return () => window.removeEventListener(mascotVisibilityEvent, update);
  }, [enabled]);

  const updateVisible = (nextVisible: boolean) => {
    setVisible(nextVisible);
    window.localStorage.setItem(VISIBILITY_KEY, String(nextVisible));
    window.dispatchEvent(new CustomEvent(mascotVisibilityEvent, { detail: nextVisible }));
  };

  return [visible, updateVisible] as const;
}
