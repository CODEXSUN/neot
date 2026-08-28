export function reviewIsCurrent(
  approvedFingerprint: string | undefined,
  currentFingerprint: string | undefined
) {
  return Boolean(
    approvedFingerprint &&
      currentFingerprint &&
      approvedFingerprint === currentFingerprint
  );
}
