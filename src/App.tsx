import React, { Suspense, useEffect, useLayoutEffect, useRef } from "react";
import { useStore } from "./store";
import { Navigation } from "./components/Navigation";
import { SettingsButton } from "./components/SettingsModal";
import { StudyView } from "./views/StudyView";
import { gsap } from "gsap";

const AnalyticsView = React.lazy(() =>
  import("./views/AnalyticsView").then((module) => ({
    default: module.AnalyticsView,
  })),
);
const RevisionView = React.lazy(() =>
  import("./views/RevisionView").then((module) => ({
    default: module.RevisionView,
  })),
);
const AdminView = React.lazy(() =>
  import("./views/AdminView").then((module) => ({ default: module.AdminView })),
);

const VALID_VIEWS = new Set(["study", "analytics", "revision", "admin"]);

function RouteFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#050505] text-sm text-zinc-500">
      Loading...
    </div>
  );
}

function GsapRouteFrame({
  children,
  routeKey,
  variant,
}: {
  children: React.ReactNode;
  routeKey: string;
  variant: "rise" | "scale" | "slide" | "admin";
}) {
  const frameRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const from =
      variant === "slide"
        ? { autoAlpha: 0, x: 20, y: 0, scale: 1 }
        : variant === "scale"
          ? { autoAlpha: 0, x: 0, y: 0, scale: 0.96 }
          : { autoAlpha: 0, x: 0, y: variant === "admin" ? 20 : 10, scale: 0.985 };

    gsap.fromTo(
      frame,
      from,
      {
        autoAlpha: 1,
        x: 0,
        y: 0,
        scale: 1,
        duration: 0.3,
        ease: "power3.out",
      },
    );
  }, [routeKey, variant]);

  return (
    <div ref={frameRef} className="absolute inset-0">
      {children}
    </div>
  );
}

export default function App() {
  const activeView = useStore((state) => state.activeView);
  const setActiveView = useStore((state) => state.setActiveView);
  const accessMode = useStore((state) => state.accessMode);

  useEffect(() => {
    if (!VALID_VIEWS.has(activeView as string)) {
      setActiveView("study");
      return;
    }
    if (accessMode === "user" && activeView === "admin") {
      setActiveView("study");
    }
  }, [accessMode, activeView, setActiveView]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey
      ) {
        return;
      }

      if (e.key === "1") setActiveView("study");
      if (e.key === "2") setActiveView("analytics");
      if (e.key === "3") setActiveView("revision");
      if (e.key === "4" && accessMode === "admin") setActiveView("admin");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [accessMode, setActiveView]);

  return (
    <div className="h-screen w-screen bg-[#050505] text-zinc-100 overflow-hidden font-sans selection:bg-blue-500/30 selection:text-blue-100 relative">
      {activeView !== "admin" && (
        <>
          <Navigation />
          <SettingsButton />
        </>
      )}

      <main className="h-full w-full relative overflow-hidden">
          {activeView === "study" && (
            <GsapRouteFrame
              key="study"
              routeKey="study"
              variant="rise"
            >
              <StudyView />
            </GsapRouteFrame>
          )}
          {activeView === "analytics" && (
            <GsapRouteFrame
              key="analytics"
              routeKey="analytics"
              variant="scale"
            >
              <Suspense fallback={<RouteFallback />}>
                <AnalyticsView />
              </Suspense>
            </GsapRouteFrame>
          )}
          {activeView === "revision" && (
            <GsapRouteFrame
              key="revision"
              routeKey="revision"
              variant="slide"
            >
              <Suspense fallback={<RouteFallback />}>
                <RevisionView />
              </Suspense>
            </GsapRouteFrame>
          )}
          {activeView === "admin" && (
            <GsapRouteFrame
              key="admin"
              routeKey="admin"
              variant="admin"
            >
              <Suspense fallback={<RouteFallback />}>
                <AdminView />
              </Suspense>
            </GsapRouteFrame>
          )}
      </main>
    </div>
  );
}
