export type BookingStatus = "new" | "confirmed" | "cancelled";

export type Service = {
  id: number;
  title: string;
  description: string;
  price: number;
  duration_min: number;
};

export type Slot = {
  start_at: string;
  end_at: string;
  is_available: boolean;
};

export type Availability = {
  date: string;
  slots: Slot[];
};

export type Booking = {
  id: number;
  user_id: number;
  service_id: number;
  booking_date: string;
  start_at: string;
  end_at: string;
  phone: string;
  comment: string | null;
  status: BookingStatus;
};

export type MyBooking = {
  id: number;
  service_id: number;
  service_title: string;
  booking_date: string;
  start_at: string;
  end_at: string;
  phone: string;
  comment: string | null;
  status: BookingStatus;
};

export type AdminBooking = {
  id: number;
  service_id: number;
  service_title: string;
  booking_date: string;
  start_at: string;
  end_at: string;
  phone: string;
  comment: string | null;
  status: BookingStatus;
  user_id: number;
  user_first_name: string;
  user_username: string | null;
  user_telegram_id: number;
};

export type TelegramLoginResponse = {
  access_token: string;
  user: {
    id: number;
    telegram_id: number;
    first_name: string;
    username: string | null;
  };
};