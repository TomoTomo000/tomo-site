import { getCloudflareEnv } from "./cloudflare/env.server";

export function getSiteUrl(request: Request): string {
  const configured = getCloudflareEnv().SITE_URL?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (
        url.protocol === "https:" ||
        (url.protocol === "http:" && url.hostname === "localhost")
      ) {
        return url.origin;
      }
    } catch {
      // 設定が不完全な場合は、リクエストのオリジンを使用する。
    }
  }

  return new URL(request.url).origin;
}
