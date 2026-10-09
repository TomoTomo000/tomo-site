import type { AnyRouteMatch } from "@tanstack/react-router";

declare module "@tanstack/react-router" {
  interface StaticDataRouteOption {
    pageStylesheet?: string;
  }
}

type StyleMatch = Pick<AnyRouteMatch, "status" | "staticData" | "_notFound">;

export function getPageStylesheet(
  matches: readonly StyleMatch[],
  fallback: { notFound: string; error: string },
): string {
  if (matches.some((match) => match.status === "notFound" || match._notFound)) {
    return fallback.notFound;
  }
  if (matches.some((match) => match.status === "error")) {
    return fallback.error;
  }
  return (
    matches.findLast((match) => match.staticData.pageStylesheet)?.staticData
      .pageStylesheet ?? fallback.notFound
  );
}
