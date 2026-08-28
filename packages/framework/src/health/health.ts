export type HealthCheck = {
  check(): Promise<HealthCheckResult> | HealthCheckResult;
  name: string;
};

export type HealthCheckResult = {
  details?: Record<string, unknown>;
  status: "degraded" | "down" | "ok";
};

export async function runHealthChecks(checks: HealthCheck[]) {
  const results: Record<string, HealthCheckResult> = {};
  let status: HealthCheckResult["status"] = "ok";

  for (const check of checks) {
    let result: HealthCheckResult;
    try {
      result = await check.check();
    } catch {
      result = {
        details: {
          reason: "Health check execution failed"
        },
        status: "down"
      };
    }
    results[check.name] = result;

    if (result.status === "down") {
      status = "down";
    } else if (result.status === "degraded" && status === "ok") {
      status = "degraded";
    }
  }

  return {
    checks: results,
    status
  };
}
