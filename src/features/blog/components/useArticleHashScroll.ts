import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "@tanstack/react-router";

function measureHeaderHeight() {
  return Math.max(
    0,
    ...Array.from(document.querySelectorAll<HTMLElement>("[data-page-header]"),
      (header) => header.getBoundingClientRect().height,
    ),
  );
}

export function useArticleHashScroll(postId: string) {
  const router = useRouter();
  const articleRef = useRef<HTMLElement>(null);
  const frame = useRef<number | null>(null);

  const scrollToHeading = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    // Run after the browser/router's default anchor scrolling.
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      let id: string;
      try {
        id = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return;
      }
      const heading = document.getElementById(id);
      if (!heading?.matches(".article-body h2, .article-body h3, .article-body h4")) return;

      const headerHeight = measureHeaderHeight();
      window.scrollTo({
        top: Math.max(0, window.scrollY + heading.getBoundingClientRect().top - headerHeight - 16),
        behavior: "instant",
      });
    });
  }, []);

  useEffect(() => {
    const updateHeaderHeight = () => {
      articleRef.current?.style.setProperty("--article-header-height", `${measureHeaderHeight()}px`);
    };
    updateHeaderHeight();
    const observer = new ResizeObserver(updateHeaderHeight);
    document.querySelectorAll("[data-page-header]").forEach((header) => observer.observe(header));
    scrollToHeading();
    window.addEventListener("hashchange", scrollToHeading);
    const unsubscribe = router.subscribe("onRendered", scrollToHeading);
    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", scrollToHeading);
      unsubscribe();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [router, postId, scrollToHeading]);

  return { articleRef, scrollToHeading };
}
