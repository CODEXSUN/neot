export function afterFirstPaint(action: () => void) {
  let timer: number | undefined;
  const frame = window.requestAnimationFrame(() => {
    timer = window.setTimeout(action, 0);
  });
  return () => {
    window.cancelAnimationFrame(frame);
    if (timer !== undefined) window.clearTimeout(timer);
  };
}

export function resourcesForActivity(activity: string) {
  return {
    changes: activity === "git",
    files: activity === "files",
    system: activity === "docker"
  };
}
