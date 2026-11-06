import React from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import App from "./App.jsx";
import "./styles.css";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#5667e8" },
    secondary: { main: "#13a89e" },
    background: { default: "#f5f7fb", paper: "#ffffff" },
    text: { primary: "#20243a", secondary: "#727890" },
    error: { main: "#dc5967" }
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Arial, sans-serif',
    button: { textTransform: "none", fontWeight: 600 }
  },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiButton: { styleOverrides: { root: { borderRadius: 9, boxShadow: "none" } } },
    MuiTableCell: { styleOverrides: { root: { borderColor: "#edf0f6" } } }
  }
});

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
