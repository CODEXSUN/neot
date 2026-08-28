import { createRoot } from "react-dom/client";
import { PlatformWebApp } from "./app/PlatformWebApp";
import "./styles.css";

createRoot(document.getElementById("root") as HTMLElement).render(<PlatformWebApp />);
