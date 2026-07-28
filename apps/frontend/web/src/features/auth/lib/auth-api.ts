import type { AuthSession } from "@kanban/types";

import { apiRequest } from "@/lib/api-client";

export type LoginPayload = {
  password: string;
  username: string;
};

export function getCurrentSession() {
  return apiRequest<AuthSession>("/api/v1/auth/me");
}

export function login(payload: LoginPayload) {
  return apiRequest<AuthSession>("/api/v1/auth/login", {
    method: "POST",
    body: payload,
  });
}

export function logout() {
  return apiRequest<void>("/api/v1/auth/logout", {
    method: "POST",
  });
}
