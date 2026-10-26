"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: { main: "#1457ad", dark: "#0d3261", light: "#daeaf9" },
    secondary: { main: "#d97706", dark: "#b45309", light: "#fef3c7" },
    success: { main: "#16a34a" },
    warning: { main: "#d97706" },
    error: { main: "#dc2626" },
    background: { default: "#f8fafc", paper: "#ffffff" },
    text: { primary: "#0f172a", secondary: "#475569" },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: 'Inter, Sarabun, "Segoe UI", system-ui, sans-serif',
    button: { fontWeight: 600, textTransform: "none" },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, boxShadow: "none", minHeight: 40 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
        rounded: {
          borderRadius: 12,
          borderColor: "rgba(203, 213, 225, 0.85)",
          boxShadow: "0 2px 8px rgba(15, 23, 42, 0.05)",
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: { backgroundColor: "#f0f7fd" },
      },
    },
  },
});

export function MuiProvider({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </AppRouterCacheProvider>
  );
}
