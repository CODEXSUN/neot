export const AGENT_STALL_WARNING_MS = 60_000;
export const AGENT_STALL_TIMEOUT_MS = 180_000;

type WatchdogOptions = {
  onRecovered: () => void;
  onStalled: () => void;
  onTimeout: () => void;
  timeoutMs?: number;
  warningMs?: number;
};

export class AgentTurnWatchdog {
  private active = false;
  private timeoutTimer: ReturnType<typeof setTimeout> | undefined;
  private warningTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly options: WatchdogOptions) {}

  start() {
    this.active = true;
    this.schedule();
  }

  touch() {
    if (!this.active) return;
    this.options.onRecovered();
    this.schedule();
  }

  stop() {
    this.active = false;
    this.clearTimers();
    this.options.onRecovered();
  }

  private schedule() {
    this.clearTimers();
    this.warningTimer = setTimeout(
      () => this.options.onStalled(),
      this.options.warningMs ?? AGENT_STALL_WARNING_MS
    );
    this.timeoutTimer = setTimeout(() => {
      this.active = false;
      this.clearTimers();
      this.options.onTimeout();
    }, this.options.timeoutMs ?? AGENT_STALL_TIMEOUT_MS);
  }

  private clearTimers() {
    if (this.warningTimer) clearTimeout(this.warningTimer);
    if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
    this.warningTimer = undefined;
    this.timeoutTimer = undefined;
  }
}
