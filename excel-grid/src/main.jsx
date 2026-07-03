import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import TenantApp from "./tenant/TenantApp.jsx";
import "./index.css";
import "react-data-grid/lib/styles.css";

const params = new URLSearchParams(window.location.search);
const useHaseko = params.get("app") === "haseko";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {useHaseko ? <App /> : <TenantApp />}
  </React.StrictMode>
);
