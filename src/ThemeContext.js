import { createContext, useContext } from "react";

export const DARK_THEME = {
  background:     "#0F172A",
  card:           "#1E293B",
  cardAlt:        "#1A2744",
  cardDeep:       "#151F33",
  border:         "#334155",
  text:           "#CBD5E1",
  textMuted:      "#64748B",
  textFaint:      "#4B5A70",
  textStrong:     "#FFFFFF",
  accent:         "#3B82F6",
  headerBg:       "#0B1120",
  inputBg:        "#0F172A",
  strategyBg:     "#0D1F3C",
  strategyBorder: "#1B3A6A",
  strategyText:   "#93C5FD",
  isDark:         true,
};

export const LIGHT_THEME = {
  background:     "#F8FAFC",
  card:           "#FFFFFF",
  cardAlt:        "#F8FAFC",
  cardDeep:       "#F1F5F9",
  border:         "#E2E8F0",
  text:           "#334155",
  textMuted:      "#64748B",
  textFaint:      "#94A3B8",
  textStrong:     "#0F172A",
  accent:         "#2563EB",
  headerBg:       "#FFFFFF",
  inputBg:        "#F1F5F9",
  strategyBg:     "#EFF6FF",
  strategyBorder: "#BFDBFE",
  strategyText:   "#1E40AF",
  isDark:         false,
};

export const ThemeContext = createContext({
  theme: DARK_THEME,
  isDark: true,
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);
