export type LogLevel = "debug" | "error" | "info" | "warn";

export type StructuredLog = {
  action?: string;
  app?: string;
  correlationId?: string;
  durationMs?: number;
  environment?: string;
  errorCode?: string;
  level: LogLevel;
  message: string;
  module?: string;
  requestId?: string;
  tenantId?: string;
  timestamp: string;
  userId?: string;
  userType?: string;
};

export function createStructuredLog(input: Omit<StructuredLog, "timestamp">): StructuredLog {
  return {
    ...input,
    timestamp: new Date().toISOString()
  };
}
