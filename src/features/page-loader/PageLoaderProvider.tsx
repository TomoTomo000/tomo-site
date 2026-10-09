import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { PageLoaderContext, type PageLoaderState } from "./usePageLoader";

type InitialPageLoaderState = "entering" | "leaving" | "done";
type RoutePageLoaderState = "loading" | "leaving-route" | "done";

export function PageLoaderProvider({
  children,
  isStylesLoading = false,
}: {
  children: ReactNode;
  isStylesLoading?: boolean;
}) {
  const isRouterLoading = useRouterState({
    select: (routerState) => routerState.isLoading,
  });
  const [initialState, setInitialState] =
    useState<InitialPageLoaderState>("entering");
  const [routeState, setRouteState] = useState<RoutePageLoaderState>("done");

  useEffect(() => {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reducedMotion) {
      const reducedMotionTimer = setTimeout(() => {
        setInitialState("done");
      }, 0);

      return () => clearTimeout(reducedMotionTimer);
    }

    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    let cancelled = false;
    let leaveTimer: ReturnType<typeof setTimeout> | undefined;
    let minimumTimer: ReturnType<typeof setTimeout> | undefined;
    let onWindowLoad: (() => void) | undefined;

    const minimumDisplay = new Promise<void>((resolve) => {
      minimumTimer = setTimeout(resolve, 750);
    });

    const pageLoaded = new Promise<void>((resolve) => {
      if (document.readyState === "complete") {
        resolve();
        return;
      }

      onWindowLoad = resolve;
      window.addEventListener("load", onWindowLoad, { once: true });
    });

    const fontsLoaded = document.fonts?.ready ?? Promise.resolve();

    void Promise.all([minimumDisplay, pageLoaded, fontsLoaded]).then(() => {
      if (cancelled) return;

      setInitialState("leaving");
      leaveTimer = setTimeout(() => {
        document.documentElement.style.overflow = previousOverflow;
        setInitialState("done");
      }, 750);
    });

    return () => {
      cancelled = true;
      if (minimumTimer) clearTimeout(minimumTimer);
      if (leaveTimer) clearTimeout(leaveTimer);
      if (onWindowLoad) window.removeEventListener("load", onWindowLoad);
      document.documentElement.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (initialState !== "done") return;

    const routeStateTimer = setTimeout(() => {
      if (isRouterLoading || isStylesLoading) {
        setRouteState("loading");
        return;
      }

      setRouteState((currentState) =>
        currentState === "loading" ? "leaving-route" : currentState,
      );
    }, 0);

    return () => clearTimeout(routeStateTimer);
  }, [initialState, isRouterLoading, isStylesLoading]);

  useEffect(() => {
    if (routeState !== "leaving-route") return;

    const routeLeaveTimer = setTimeout(() => {
      setRouteState("done");
    }, 300);

    return () => clearTimeout(routeLeaveTimer);
  }, [routeState]);

  const state: PageLoaderState = isStylesLoading
    ? "loading"
    : initialState === "done"
      ? routeState
      : initialState;
  const value = useMemo(() => ({ state }), [state]);

  return (
    <PageLoaderContext.Provider value={value}>
      {children}
    </PageLoaderContext.Provider>
  );
}
