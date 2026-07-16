import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { FONT_IMPORT_URL, COLORS } from "./theme";

// Load the shared font stack (same Google Fonts URL as the public site).
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = FONT_IMPORT_URL;
document.head.appendChild(fontLink);

document.body.style.margin = "0";
document.body.style.background = COLORS.ink;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
