import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Home } from "@/routes/index";
import "./styles.css";

const root = document.getElementById("app");
if (!root) {
  throw new Error("Missing #app mount point in index.html");
}

createRoot(root).render(
  <StrictMode>
    <Home />
  </StrictMode>,
);
