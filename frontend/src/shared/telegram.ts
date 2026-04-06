import { useEffect } from "react";

type TelegramWindow = Window & {
  Telegram?: {
    WebApp?: {
      ready?: () => void;
      expand?: () => void;
    };
  };
};

export function useTelegramApp() {
  useEffect(() => {
    const webApp = (window as TelegramWindow).Telegram?.WebApp;

    webApp?.ready?.();
    webApp?.expand?.();
  }, []);
}