import { createContext, useContext } from "react";

export const DARK_THEME = {
  background:     "#0A0F1E",
  card:           "#111827",
  cardAlt:        "#0D1117",
  cardDeep:       "#0C1018",
  border:         "#1E2D40",
  text:           "#CBD5E1",
  textMuted:      "#6B7FA3",
  textFaint:      "#4B5A70",
  textStrong:     "#FFFFFF",
  accent:         "#00E5A0",
  headerBg:       "#090E1C",
  inputBg:        "#0A0F1E",
  strategyBg:     "#0D1F2D",
  strategyBorder: "#1B3A52",
  strategyText:   "#A8D8F0",
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
  accent:         "#059669",
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
