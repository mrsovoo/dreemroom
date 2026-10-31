import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./telegram.css";
import { applyBrandTheme, loadStoreSettings } from "./config/brandConfig";
import App from "./App";

// Mavzuni dastlabki yuklash
applyBrandTheme();
loadStoreSettings();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
