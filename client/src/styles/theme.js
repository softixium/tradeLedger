export const ExtraSmallMobileView = "(max-width: 550px)";
export const SmallMobileView = "(max-width: 768px)";
export const TabletView = "(max-width: 900px)";
export const MobileView = "(max-width: 1024px)";
export const IpadView = "(min-width: 768px) and (max-width: 1024px)";

export const colors = {
  // Brand colors
  primary: "#2563EB", // Brand Blue
  secondary: "#0F172A", // Dark Navy
  
  // Base colors
  white: "#FFFFFF",
  black: "#000000",
  background: "#F8FAFC", // Surface White/Gray
  
  // Surface
  surface: "#FFFFFF",
  surfaceMuted: "#F1F5F9",
  
  // Text
  textPrimary: "#1E293B", // Slate
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  
  // Borders
  border: "#E2E8F0",
  borderLight: "#F1F5F9",
  borderHover: "#CBD5E1",
  
  // Semantic status
  success: "#16A34A",
  successLight: "#DCFCE7",
  successDark: "#15803D",
  
  error: "#DC2626",
  errorLight: "#FEE2E2",
  errorDark: "#B91C1C",
  
  warning: "#D97706",
  warningLight: "#FEF3C7",
  warningDark: "#B45309",
  
  info: "#3B82F6",
  infoLight: "#DBEAFE",
  infoDark: "#1D4ED8",
  
  // Legacy color scale mapping (if used elsewhere, keep to avoid breaking)
  950: "#020617",
  900: "#0F172A",
  800: "#1E293B",
  700: "#334155",
  600: "#475569",
  500: "#64748B",
  400: "#94A3B8",
  300: "#CBD5E1",
  200: "#E2E8F0",
  100: "#F1F5F9",
  50: "#F8FAFC",
};

export const shadows = {
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  DEFAULT: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
};

export const borderRadius = {
  sm: "4px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  "2xl": "20px",
  full: "9999px",
};
