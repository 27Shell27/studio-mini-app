{/*Это простая навигация между двумя основными экранами приложения. */}
import { NavLink } from "react-router-dom";

export function AppTabs() {
  return (
    <nav className="tabs">
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          "tab-link" + (isActive ? " tab-link--active" : "")
        }
      >
        Услуги
      </NavLink>

      <NavLink
        to="/my-bookings"
        className={({ isActive }) =>
          "tab-link" + (isActive ? " tab-link--active" : "")
        }
      >
        Мои записи
      </NavLink>
    </nav>
  );
}