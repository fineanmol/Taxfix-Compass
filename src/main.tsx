import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { registerSW } from "virtual:pwa-register";
import { loadSampleData, clearSampleData } from "./lib/sampleData";
import { applyTheme } from "./lib/theme";

// Default to the light (white) page theme before settings load, so the
// Taxfix evergreen dark fill is never the first paint.
applyTheme("light");

// Auto-update the service worker and reload as soon as a new build is ready,
// so users are never stuck on a stale cached bundle.
try {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateSW(true); // activate the new SW and reload
    },
  });
} catch (err) {
  console.error("Service worker registration failed", err);
}

// Console helpers stay in dev; production uses Settings / empty-state demo data.
if (import.meta.env.DEV && typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__loadSample = loadSampleData;
  (window as unknown as Record<string, unknown>).__clearSample = clearSampleData;
  (window as unknown as Record<string, unknown>).__applyTheme = applyTheme;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
