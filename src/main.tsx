import { queryClient } from "@/lib/queryClient";
import "@/styles/departments.css";
import "@/styles/hr.css";
import "@/styles/index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const root = createRoot(document.getElementById("root")!);
const app = (
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);

root.render(import.meta.env.DEV ? <StrictMode>{app}</StrictMode> : app);
