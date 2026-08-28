import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { DesktopApp } from "./shell/desktop-app";
import "./styles.css";

function releaseStartupLoader() {
  const loader = document.getElementById("startup-loader");
  if (!loader || loader.dataset.state === "ready") return;

  window.requestAnimationFrame(() => {
    loader.dataset.state = "ready";
    window.setTimeout(() => loader.remove(), 160);
  });
}

function AppRoot() {
  useEffect(() => {
    releaseStartupLoader();
  }, []);

  return <DesktopApp />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppRoot />
  </StrictMode>
);
