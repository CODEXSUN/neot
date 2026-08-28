import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentTurnWatchdog } from "./agent-turn-watchdog";

afterEach(() => vi.useRealTimers());

describe("AgentTurnWatchdog", () => {
  it("warns and then stops a turn after bounded inactivity", () => {
    vi.useFakeTimers();
    const onStalled = vi.fn();
    const onTimeout = vi.fn();
    const watchdog = new AgentTurnWatchdog({
      onRecovered: vi.fn(),
      onStalled,
      onTimeout,
      warningMs: 60,
      timeoutMs: 180
    });

    watchdog.start();
    vi.advanceTimersByTime(60);
    expect(onStalled).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(120);
    expect(onTimeout).toHaveBeenCalledOnce();
  });

  it("resets inactivity when an event arrives", () => {
    vi.useFakeTimers();
    const onStalled = vi.fn();
    const watchdog = new AgentTurnWatchdog({
      onRecovered: vi.fn(),
      onStalled,
      onTimeout: vi.fn(),
      warningMs: 60,
      timeoutMs: 180
    });

    watchdog.start();
    vi.advanceTimersByTime(50);
    watchdog.touch();
    vi.advanceTimersByTime(50);
    expect(onStalled).not.toHaveBeenCalled();
    vi.advanceTimersByTime(10);
    expect(onStalled).toHaveBeenCalledOnce();
  });

  it("cancels timers after a turn completes", () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();
    const watchdog = new AgentTurnWatchdog({
      onRecovered: vi.fn(),
      onStalled: vi.fn(),
      onTimeout,
      warningMs: 60,
      timeoutMs: 180
    });

    watchdog.start();
    watchdog.stop();
    vi.runAllTimers();
    expect(onTimeout).not.toHaveBeenCalled();
  });
});
