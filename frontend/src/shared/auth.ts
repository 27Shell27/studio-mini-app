//авторизация на фронте

import type { TelegramLoginResponse } from "./types";

const API_BASE =
  import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api/v1";

const ACCESS_TOKEN_KEY = "access_token";

type TelegramWindow = Window & {
  Telegram?: {
    WebApp?: {
      initData?: string;
    };
  };
};

function getTelegramInitDataRaw(): string {
  return (
    (window as TelegramWindow).Telegram?.WebApp?.initData ||
    "query_id=dev-query-1"
  );
}

function setAccessToken(token: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export function getStoredAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

async function parseErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => null);
    if (payload && typeof payload === "object" && "detail" in payload) {
      return String(payload.detail);
    }
    return "Request failed";
  }

  const text = await response.text().catch(() => "");
  return text || "Request failed";
}

export async function fetchNewAccessToken(): Promise<string> {
  const response = await fetch(`${API_BASE}/auth/telegram-login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      init_data_raw: getTelegramInitDataRaw(),
    }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  const result = (await response.json()) as TelegramLoginResponse;
  setAccessToken(result.access_token);

  return result.access_token;
}

export async function refreshAccessToken(): Promise<string> {
  clearAccessToken();
  return fetchNewAccessToken();
}

export async function bootstrapAccessToken(): Promise<string> {
  const existingToken = getStoredAccessToken();
  if (existingToken) {
    return existingToken;
  }

  return fetchNewAccessToken();
}

export function getAccessToken(): string {
  const token = getStoredAccessToken();

  if (!token) {
    throw new Error("Access token is missing");
  }

  return token;
}