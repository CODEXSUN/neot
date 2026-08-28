export type RuntimeEnvironment = "development" | "production" | "staging" | "test";

export type AppConfig = {
  appName: string;
  environment: RuntimeEnvironment;
  host: string;
  port: number;
};
