export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiRequestOptions = {
  body?: unknown;
  method?: "GET" | "PATCH" | "POST";
};

export async function apiRequest<T>(
  path: string,
  { body, method = "GET" }: ApiRequestOptions = {},
): Promise<T> {
  const requestInit: RequestInit = {
    method,
    credentials: "include",
  };

  if (body !== undefined) {
    requestInit.headers = { "Content-Type": "application/json" };
    requestInit.body = JSON.stringify(body);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, requestInit);

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

function getApiBaseUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  if (window.location.port === "3000") {
    return "http://localhost:8000";
  }

  return "";
}

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as { detail?: unknown };
    return typeof payload.detail === "string" ? payload.detail : "Request failed.";
  } catch {
    return "Request failed.";
  }
}
