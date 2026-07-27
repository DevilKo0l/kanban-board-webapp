export type ApiStatus = {
  name: string;
  version: string;
  apiPrefix: string;
};

export type HealthStatus = {
  status: "ok";
  appEnv: string;
};

export type BoardStatusKey = "todo" | "in_progress" | "in_review" | "closed";
