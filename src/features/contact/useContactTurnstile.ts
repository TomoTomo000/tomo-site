import { useEffect, useRef, useState } from "react";

export function useContactTurnstile(sitekey: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);
  const [error, setError] = useState<"load" | "unsupported" | null>(null);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let script: HTMLScriptElement | undefined;
    const fail = () => {
      if (disposed) return;
      setError((current) => current === "unsupported" ? current : "load");
      setVerified(false);
    };
    const timeout = window.setTimeout(fail, 15_000);
    const render = () => {
      if (disposed || typeof turnstile === "undefined") return;
      try {
        setError(null);
        widgetRef.current = turnstile.render(container, {
          sitekey,
          action: "contact_submit",
          size: "normal",
          callback: () => {
            if (disposed) return;
            window.clearTimeout(timeout);
            setError(null);
            setVerified(true);
          },
          "error-callback": fail,
          "unsupported-callback": () => {
            if (disposed) return;
            window.clearTimeout(timeout);
            setError("unsupported");
            setVerified(false);
          },
          "expired-callback": () => {
            if (!disposed) setVerified(false);
          },
          "timeout-callback": fail,
        }) ?? null;
        if (widgetRef.current === null) {
          fail();
        } else {
          window.clearTimeout(timeout);
        }
      } catch {
        fail();
      }
    };

    if (typeof turnstile !== "undefined") {
      render();
    } else {
      script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.addEventListener("load", render);
      script.addEventListener("error", fail);
      document.head.appendChild(script);
    }

    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      script?.removeEventListener("load", render);
      script?.removeEventListener("error", fail);
      script?.remove();
      if (widgetRef.current !== null && typeof turnstile !== "undefined") {
        turnstile.remove(widgetRef.current);
      }
      widgetRef.current = null;
    };
  }, [sitekey]);

  const reset = () => {
    setVerified(false);
    if (widgetRef.current !== null && typeof turnstile !== "undefined") {
      turnstile.reset(widgetRef.current);
    }
  };

  return { containerRef, error, verified, reset };
}
