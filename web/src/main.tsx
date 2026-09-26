import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { queryClient } from "./lib/queries";
import "./styles.css";

const root = createRoot(document.getElementById("root")!);

if (import.meta.env.DEV && location.hash === "#flowlab") {
  // Dev-only diagram design bench (web/src/dev/FlowLab.tsx); dropped from production builds.
  void import("./dev/FlowLab").then(({ FlowLab }) =>
    root.render(
      <MotionConfig reducedMotion="user">
        <FlowLab />
      </MotionConfig>,
    ),
  );
} else {
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion="user">
          <App />
        </MotionConfig>
      </QueryClientProvider>
    </StrictMode>,
  );
}
