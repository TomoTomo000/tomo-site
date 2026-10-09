import { defineMiddleware } from "astro:middleware";
const securityHeaders = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self' https://challenges.cloudflare.com",
    "font-src 'self'",
    "form-action 'self'",
    "frame-src https://challenges.cloudflare.com",
    "frame-ancestors 'none'",
    "img-src 'self' data: https://images.microcms-assets.io",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
  ].join("; "),
  "Permissions-Policy":
    "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(securityHeaders))
    headers.set(name, value);
  if (response.status >= 400) headers.set("X-Robots-Tag", "noindex");
  if (context.url.pathname.startsWith("/blog/preview/")) {
    headers.set("Cache-Control", "private, no-store");
    headers.set("Pragma", "no-cache");
    headers.set("Referrer-Policy", "no-referrer");
    headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
});
