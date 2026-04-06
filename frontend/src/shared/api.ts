import {
  clearAccessToken,
  refreshAccessToken,
} from "./auth";
import type {
  AdminBooking,
  Availability,
  Booking,
  BookingStatus,
  MyBooking,
  Service,
  TelegramLoginResponse,
} from "./types";

const API_BASE =
  import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api/v1";

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
  return text || `Request failed with status ${response.status}`;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  token?: string,
  retryOn401 = true
): Promise<T> {
  const headers = new Headers(init.headers ?? {});

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 401 && token && retryOn401) {
    clearAccessToken();

    try {
      const freshToken = await refreshAccessToken();
      return request<T>(path, init, freshToken, false);
    } catch {
      throw new Error("Сессия истекла. Попробуй обновить страницу.");
    }
  }

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

export const api = {
  telegramLogin(initDataRaw: string) {
    return request<TelegramLoginResponse>("/auth/telegram-login", {
      method: "POST",
      body: JSON.stringify({
        init_data_raw: initDataRaw,
      }),
    });
  },

  getServices() {
    return request<Service[]>("/services");
  },

  getService(serviceId: number) {
    return request<Service>(`/services/${serviceId}`);
  },

  getAvailability(serviceId: number, day: string) {
    return request<Availability>(
      `/services/${serviceId}/availability?day=${encodeURIComponent(day)}`
    );
  },

  createBooking(
    token: string,
    payload: {
      service_id: number;
      booking_date: string;
      start_at: string;
      phone: string;
      comment?: string;
    }
  ) {
    return request<Booking>(
      "/bookings",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      token
    );
  },

  getMyBookings(token: string) {
    return request<MyBooking[]>("/bookings/me", {}, token);
  },

  cancelBooking(token: string, bookingId: number) {
    return request<MyBooking>(
      `/bookings/${bookingId}/cancel`,
      {
        method: "PATCH",
      },
      token
    );
  },

  getAdminBookings(token: string, status?: BookingStatus | "all") {
    const suffix =
      status && status !== "all"
        ? `?status=${encodeURIComponent(status)}`
        : "";

    return request<AdminBooking[]>(`/admin/bookings${suffix}`, {}, token);
  },

  updateAdminBookingStatus(
    token: string,
    bookingId: number,
    status: Exclude<BookingStatus, "new">
  ) {
    return request<AdminBooking>(
      `/admin/bookings/${bookingId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
      token
    );
  },
};