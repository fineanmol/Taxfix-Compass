import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { registerSW } from "virtual:pwa-register";
import { loadSampleData } from "./lib/sampleData";
import { applyTheme } from "./lib/theme";

// Auto-update the service worker and reload as soon as a new build is ready,
// so users are never stuck on a stale cached bundle.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true); // activate the new SW and reload
  },
});

// Dev/testing helpers accessible from the console.
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__loadSample = loadSampleData;
  (window as unknown as Record<string, unknown>).__applyTheme = applyTheme;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
